import logging
# import base64
from datetime import datetime as dt, timezone
# import pytz
import time
import os
import json
import uuid
from urllib.parse import unquote
# import pytz
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer


ddb_client = boto3.client('dynamodb')

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
LEAGUE_TABLE_NAME = os.environ['STORAGE_LEAGUES_NAME']
PLAYER_TABLE_NAME = os.environ['STORAGE_PLAYERS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
    league_data = json.loads(event['body'])
    status_code = 200
    if event['httpMethod'] == 'GET':
        league_id = event['pathParameters']['leagueid']
        player_info = ddb_get_player(username, PLAYER_TABLE_NAME)
        admin_leagues = player_info['body']['league_admin']
        if league_id in admin_leagues:
            pass #TODO add get league call here and refactor league admin check
        else:
            result = {"leagueStatus": "Forbidden"}
            status_code = 403
    elif event['httpMethod'] == 'PUT':
        league_id = event['pathParameters']['leagueid']
        player_info = ddb_get_player(username, PLAYER_TABLE_NAME)
        admin_leagues = player_info['body']['league_admin']
        if league_id in admin_leagues:
            update_league_response = ddb_update_league(
                league_data=league_data,
                league_id=league_id,
                league_table=LEAGUE_TABLE_NAME
            )
            result = {"leagueStatus": update_league_response['body']}
            status_code = update_league_response['statusCode']
        else:
            result = {"leagueStatus": "Forbidden"}
            status_code = 403
    elif event['httpMethod'] == 'POST':
        create_league_response = ddb_create_league(
            league_table=LEAGUE_TABLE_NAME, 
            league_data=league_data, 
            player_table=PLAYER_TABLE_NAME,
            username=username
            )
        result = {"leagueId": create_league_response['id']}
        status_code = create_league_response['statusCode']
    else:
        result = f"HTTP method {event['httpMethod']} not supported yet: {event}"
        logger.error(result)
  
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET'
        },
        'body': json.dumps(result)
    }


def get_current_datetime():
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))


def generate_league_id():
    """
    Generates a random 6 character alphanumeric league id that is unique
    """
    from string import ascii_letters, digits
    from random import choice

    league_id = ''
    league_exists = True
    while league_exists == True:
        league_id = ''.join([choice(ascii_letters + digits) for i in range(6)]).upper()
        check_league_exists = ddb_client.get_item(
            TableName=LEAGUE_TABLE_NAME,
            Key={
                'id': {
                    'S': league_id
                }
            }
        )
        if 'Item' in check_league_exists.keys():
            logger.info(f"Duplicate league id {league_id} found, trying again to regenerate.")
            league_exists = True
        else:
            league_exists = False

    return league_id


def ddb_create_league(league_table, league_data, player_table, username):
    """
    creates league record in leagues ddb table
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    try:
        serializer = TypeSerializer()
        # data_to_serialize = {}
        league_id = generate_league_id()
        # for k in unquote(data['body']).split("&"):
        #     pair = k.split("=")
        #     if pair[1] and pair[0] != 'leaguename':
        #         if pair[1] and pair[0] == 'logo':
        #             save_logo_response = save_logo(
        #                 logo_object=pair[1], 
        #                 bucket=ASSETS_BUCKET_NAME
        #             )
        #             data_to_serialize[pair[0]] = save_logo_response['body']
        #         else:
        #             data_to_serialize[pair[0]] = pair[1]

        serialized_data = {k: serializer.serialize(v) for k,v in league_data.items()}
        current_date_utc_int = get_current_datetime()
        mandatory_fields = {
            'date_added': { 
                'N': str(current_date_utc_int)
            },
            'modified': {
                'N': str(current_date_utc_int)
            },
            'id': {
                'S': league_id
            },
            'memberships': {
                'L': []
            },
        }

    
        # shallow merge of dicts
        item = {**mandatory_fields, **serialized_data}

        ddb_response = ddb_client.put_item(
            TableName=league_table,
            Item=item,
            ConditionExpression='attribute_not_exists(id)',
            ReturnValues='NONE'
        )
        # logger.info(ddb_response)
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        
        update_player_response = ddb_update_player(player_table, username, league_id)
        status_code = update_player_response['statusCode']
        result = f'League {league_id} created'
        return {
            'statusCode': status_code,
            'body': result,
            'id': league_id
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'Something went wrong'
        }


def ddb_update_league(league_table, league_data, league_id):
    """
    creates league record in leagues ddb table
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    try:
        current_date_utc_int = get_current_datetime()
        serializer = TypeSerializer()
        serialized_data = {k: serializer.serialize(v) for k,v in league_data.items()}
        expression_attribute_names = {
                '#modified': 'modified',
            }

        expression_attribute_values = {
                ':modified': {
                    'N': str(current_date_utc_int)
                },
            }
        update_expression = 'SET #modified = :modified'

        for k in serialized_data:
            expression_attribute_names[f"#{k}"] = k
            expression_attribute_values[f":{k}"] = serialized_data[k]
            if list(serialized_data[k].keys())[0]=='L': # append values to lists - don't replace
                update_expression+=f", #{k} = list_append(#{k} = :{k})"
            else:
                update_expression+=f", #{k} = :{k}"
        
        logger.info(f"Using the following attribute values: {expression_attribute_values}")
        logger.info(f"Attempting update with expression: {update_expression}")

        ddb_response = ddb_client.update_item(
            TableName=league_table,
            Key={
                'id': {
                    'S': league_id
                }
            },
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            UpdateExpression=update_expression,
            ReturnValues='NONE'
        )

        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = f'League {league_id} updated'
        return {
            'statusCode': status_code,
            'body': result
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'error: league did not update'
        }


def ddb_update_player(player_table, username, league_id):
    """
    updates player profile record with league they're administrating
    :params
    :data               : the data dictionary of values to use for put action
    :player_table       : the name of the ddb table
    :league_id          : the league id this player is an admin of
    """
    current_date_utc_int = get_current_datetime()

    expression_attribute_names = {
            '#modified': 'modified',
            '#leagueadmin': 'league_admin'
        }

    expression_attribute_values = {
            ':modified': {
                'N': str(current_date_utc_int)
            },
            ':leagueadmin': {
                'L': [
                    {'S': league_id}
                ]
            }
        }
    update_expression = 'SET #modified = :modified, #leagueadmin = list_append(#leagueadmin, :leagueadmin)'

    status_code = 200
    result = ''
    try:
        ddb_response = ddb_client.update_item(
            TableName=player_table,
            Key={
                'id': {
                    'S': username
                }
            },
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            UpdateExpression=update_expression,
            ReturnValues='NONE'
        )
        logger.info(ddb_response)
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = ddb_response['ResponseMetadata']

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        status_code = 400
        result = f"{error_code}: {error_msg}"

    return {
        'statusCode': status_code,
        'body': result
    }


def ddb_get_player(username, table):
    """
    returns player info based on username
    :params
    :username       : player username
    :table          : the table to query
    """

    result = {}
    
    try:
        ddb_response = ddb_client.get_item(
            TableName=table,
            Key={
                'id': {
                    'S': username
                }
            }
        )

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"
    else:
        d = TypeDeserializer()
        deserialized = {k: d.deserialize(v) for k, v in ddb_response.get("Item").items()}

        if 'modified' in deserialized.keys():
            deserialized.pop('modified')
            ### convert unix timestamps to formatted string  
            ### get to this later - removing attribute for now
            # modifed_timestamp = convert_unix_ts(deserialized['modified'])
            # deserialized['modified'] = modifed_timestamp
        logger.info(deserialized)
        result['statusCode'] = 200
        result['body'] = deserialized

    return result