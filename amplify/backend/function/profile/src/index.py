import logging
from datetime import datetime as dt, timezone
import time
import os
import json
import pytz
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeSerializer
from boto3.dynamodb.conditions import Key

# env vars
PLAYER_TABLE_NAME = os.environ['STORAGE_PLAYERS_NAME']
LEAGUE_TABLE_NAME = os.environ['STORAGE_LEAGUES_NAME']
PROGRAM_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']
MEMBERS_TABLE_NAME = os.environ['STORAGE_MEMBERS_NAME']
MEMBERSHIPS_TABLE_NAME = os.environ['STORAGE_MEMBERSHIPS_NAME']
STORAGE_PLAYERPHOTOS_BUCKETNAME = os.environ['STORAGE_PLAYERPHOTOS_BUCKETNAME']

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')
s3_resource = boto3.resource('s3')

date_fields = [
    'modified', 
    'date_added', 
    'registration_date', 
    'effective_date', 
    'expiration_date'
    ]

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info(f'received event: {event}')
    username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
    if event['httpMethod'] == 'GET':
        
        logger.info(f'Fetching info on user: {username}')
        result = ddb_get_player(
            username=username, 
            player_table=PLAYER_TABLE_NAME, 
            league_table=LEAGUE_TABLE_NAME, 
            program_table=PROGRAM_TABLE_NAME, 
            members_table=MEMBERS_TABLE_NAME
            )

    elif event['httpMethod'] == 'PUT':
        path_username = event['pathParameters']['id']
        if path_username == username:
            logger.info(f'putting data to {PLAYER_TABLE_NAME} for user {username}')
            result = ddb_update_player(PLAYER_TABLE_NAME, username, json.loads(event['body']))
        else:
            logger.error(f"authenticated user id {username} does not match path parameter for id of {path_username}. Not updating player.")
            result = {
                'statusCode': 403,
                'body': 'Forbidden'
            }

    else:
        result = {
            'statusCode': 405,
            'body': 'Method Not Allowed'
        }

    return {
        'statusCode': result['statusCode'],
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, GET'
        },
        'body': json.dumps(result['body'])
    }


def get_current_datetime():
    '''
    Returns current date time in UTC formatted as YYYYMMDDHHMMSSssssss
    '''
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))


def convert_to_iso_date(date_number, from_format):
    '''
    returns ISO formatted date time string

    :params
    :date_number    : integer version of date YYYYMMDDHHMMSS.ssssss
    :from_format    : format of the date as received
    '''
    date_time = dt.strptime(str(date_number) + '+0000', from_format + '%z')
    return date_time.isoformat()


def clean_ddb_types(ddb_item, date_fields):
    """
    Converts Dynamo DB Decimals into python data types
    converts date fields into iso date formats
    """
    new_ddb_item= {}
    for k in ddb_item:
        if k in date_fields:
            new_ddb_item[k] = convert_to_iso_date(ddb_item[k], DATE_FORMAT_DB)
        elif isinstance(ddb_item[k], Decimal):
            if ddb_item[k] % 1 == 0:
                new_ddb_item[k] = int(ddb_item[k])
            else:
                new_ddb_item[k] = float(ddb_item[k])
        else:
            new_ddb_item[k] = ddb_item[k]
    return new_ddb_item


def ddb_get_player(username, player_table, league_table, program_table, members_table):

    """
    returns player info based on username
    :params
    :username       : player username
    :table          : the table to query
    """

    result = {}
    new_profile = {}
    player_table_ddb = ddb_resource.Table(player_table)
    logger.info(f"Getting info on player: {username}")
    try:
        ddb_response = player_table_ddb.get_item(
            Key={
                'id': username
            }
        )
        logger.info(ddb_response)
        profile_response = ddb_response['Item']
        new_profile = clean_ddb_types(
            ddb_item=profile_response, 
            date_fields=date_fields
        )
        
        player_memberships = ddb_get_memberships(
            player_id=username, 
            members_table=members_table
            )
        
        if player_memberships['statusCode'] == 200:
            new_profile['memberships'] = player_memberships['body']
        else:
            new_profile['memberships'] = []

        logger.info(f'profile object: {new_profile}')
        if 'league_admin' in new_profile.keys() and len(new_profile['league_admin']) > 0:
            get_leagues_response = ddb_get_leagues(
                league_ids=profile_response['league_admin'], 
                league_table=league_table, 
                program_table=program_table
            )
            new_profile['league_admin_info'] = get_leagues_response['body']
        logger.info(f'profile object: {new_profile}')
        
        result['body'] = new_profile
        result['statusCode'] = 200
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result


def ddb_update_player(table, player_id, data):
    """
    updates player profile record
    :params
    :data               : the data dictionary of values to use for put action
    :table              : the name of the ddb table
    :id                 : unique id of player
    """
    if 'id' in data.keys():  # remove the id field since this is a primary key
        data.pop('id')
    if 'memberships' in data.keys(): # we never update memberships when updating profile
        data.pop('memberships') 

    # serializer = TypeSerializer()
    players_table = ddb_resource.Table(table)
    # serialized_data = {k: serializer.serialize(v) for k,v in data.items()}
    current_date_utc_int = get_current_datetime()

    expression_attribute_names = {
            '#modified': 'modified'
        }

    expression_attribute_values = {
            ':modified': str(current_date_utc_int)
        }

    update_expression = 'SET '
    # build expression attribute names and values
    for key in data.keys():
        if key not in date_fields:
            expression_attribute_names[f"#{key}"] = key
            expression_attribute_values[f":{key}"] = data[key]
            if key  == 'avatarUrl':
                delete_old_avatar(
                    incoming_avatar_url=data['avatarUrl'],
                    photos_bucket=STORAGE_PLAYERPHOTOS_BUCKETNAME,
                    photos_bucket_prefix='public',
                    players_table=PLAYER_TABLE_NAME,
                    player_id=player_id
                )
            if key == 'govIdUrl':
                delete_old_govid(
                    incoming_govid_url=data['govIdUrl'], 
                    photos_bucket=STORAGE_PLAYERPHOTOS_BUCKETNAME, 
                    players_table=PLAYER_TABLE_NAME, 
                    player_id=player_id
                    )
    # build update expression
    attribute_updates = []
    for attribute in expression_attribute_names:
        attribute_updates.append(f"{attribute} = {attribute.replace('#',':')}")
    update_expression += ', '.join(attribute_updates)

    status_code = 200
    result = ''
    try:
        ddb_response = players_table.update_item(
            TableName=table,
            Key={
                'id': player_id
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


def ddb_get_leagues(league_ids, league_table, program_table):
    """
    Takes a list of league ids and gets their info

    :params
    :league_ids         :list of league ids
    :league_table       :leagues dynamodb table

    TODO:
    need to improve serialization here to get full ddb response
    """
    result = {}
    ddb_keys = []
    request_items = {}

    league_result = []

    for league_id in league_ids:
        ddb_keys.append({'id': league_id})

    request_items[league_table] = {
            'Keys': ddb_keys
        }

    try:
        ddb_response = ddb_resource.batch_get_item(
            RequestItems=request_items
        )
        for league in ddb_response['Responses'][league_table]:
            new_league = clean_ddb_types(
                    ddb_item=league, 
                    date_fields=date_fields
                )
     
            programs = ddb_get_programs(league['id'], program_table)
            new_league['programs'] = programs['body']
            league_result.append(new_league)

        result['statusCode'] = 200
        result['body'] = league_result
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result


def ddb_get_programs(league_id, program_table):
    """
    Takes a league id and gets the its program info

    :params
    :league_ids         :list of league ids
    :program_table       :leagues dynamodb table

    TODO:
    need to improve serialization here to get full ddb response
    """
    program_result = []
    result = {}
    program_table_ddb = ddb_resource.Table(program_table)
    try:
        ddb_response = program_table_ddb.query(
            TableName=program_table,
            IndexName="ixleagueid",
            KeyConditionExpression=Key('leagueid').eq(league_id),
        )
        for program in ddb_response['Items']:
            new_program = clean_ddb_types(
                    ddb_item=program, 
                    date_fields=date_fields
                )
            program_result.append(new_program)

        result['statusCode'] = 200
        result['body'] = program_result
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result



def ddb_get_memberships(player_id, members_table):
    """
    Returns memberships for a specific player

    :params
    :player_id
    :members_table 

    """

    memberships_result = []
    result = {}
    ddb_table = ddb_resource.Table(members_table)
    try:
        ddb_response = ddb_table.query(
            TableName=members_table,
            IndexName="ixplayerid",
            KeyConditionExpression=Key('playerid').eq(player_id),
        )
        logger.info(ddb_response)
        for membership in ddb_response['Items']:
            logger.info(membership)
            new_memberships = clean_ddb_types(
                ddb_item=membership, 
                date_fields=date_fields
            )

            membership_details_response = ddb_get_membership_details(
                membership_id=membership['membershipid'], 
                memberships_table=MEMBERSHIPS_TABLE_NAME, 
                programs_table=PROGRAM_TABLE_NAME, 
                league_table=LEAGUE_TABLE_NAME
                )
            if membership_details_response['statusCode'] == 200:
                new_memberships['membership_details'] = membership_details_response['body']
            else:
                logger.error(membership_details_response)
            memberships_result.append(new_memberships)

        result['statusCode'] = 200
        result['body'] = memberships_result
        print('from get_memberships', memberships_result)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result


def ddb_get_membership_details(membership_id, memberships_table, programs_table, league_table):
    """
    Returns program and league details given a membership id

    :params
    :program_id
    :programs_table 

    """

    result = {}
    ddb_table_programs = ddb_resource.Table(programs_table)
    ddb_table_leagues = ddb_resource.Table(league_table)
    ddb_table_memberships = ddb_resource.Table(memberships_table)
    membership_details = {}
    try:
        logger.info(f"Getting info on membership id: {membership_id}")
        memberships_response = ddb_table_memberships.get_item(
            Key={
                'id': membership_id
            }
        )
        new_membership = clean_ddb_types(
                    ddb_item=memberships_response['Item'], 
                    date_fields=date_fields
                )

        membership_details['membership_info'] = new_membership

        program_id = memberships_response['Item']['programid']

        program_response = ddb_table_programs.get_item(
            Key={
                'id': program_id
            },
            AttributesToGet=[
                'requiredFields',
                'name'
            ],
        )
        logger.info(program_response)
        membership_details['program_info'] = program_response['Item']

        league_id = program_id.split('-')[0]
        league_response = ddb_table_leagues.get_item(
            Key={
                'id': league_id
            },
            AttributesToGet=[
                'website',
                'name',
                'nickname',
                'leagueDesc',
                'address1',
                'address2',
                'state',
                'city',
                'postCode',
                'leagueType',
                'contactName',
                'email',
                'logo_url'
            ],
        )
        logger.info(league_response)
        membership_details['league_info'] = league_response['Item']
        result['statusCode'] = 200
        result['body'] = membership_details
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result


def delete_old_avatar(incoming_avatar_url, photos_bucket, photos_bucket_prefix, players_table, player_id):
    '''
    Deletes the old profile photo from s3 if the incoming one is different
    : params
    : player_id                 :
    : incoming_avatar_url       :
    : photos_bucket             :
    : photos_bucket_prefix      :
    : players_table             :
    '''
    players_table_ddb = ddb_resource.Table(players_table)
    get_photo_response = players_table_ddb.get_item(
        Key={
            'id': player_id
        },
        ProjectionExpression='avatarUrl'
    )
    if 'Item' in get_photo_response.keys() and 'avatarUrl' in get_photo_response['Item'].keys():
        existing_avatar = get_photo_response['Item']['avatarUrl']
        if existing_avatar != incoming_avatar_url:
            try:
                old_photo = s3_resource.Object(photos_bucket, f"{photos_bucket_prefix}/{existing_avatar}")
                old_photo.delete()
                logger.info('Delete success')
            except ClientError as e:
                logger.error(e)
        else:
            logger.info("didn't receive a new avatar photo.")
    else:
        logger.info('No existing avatar to delete.')


def delete_old_govid(incoming_govid_url, photos_bucket, players_table, player_id):
    '''
    Deletes the old profile photo from s3 if the incoming one is different
    : params
    : player_id                 :
    : incoming_govid_url        :
    : photos_bucket             :
    : players_table             :
    '''
    players_table_ddb = ddb_resource.Table(players_table)
    get_govid_response = players_table_ddb.get_item(
        Key={
            'id': player_id
        },
        ProjectionExpression='govIdUrl'
    )
    if 'Item' in get_govid_response.keys() and 'govIdUrl' in get_govid_response['Item'].keys():
        existing_govid = get_govid_response['Item']['govIdUrl']
        if existing_govid != incoming_govid_url:
            try:
                old_govid = s3_resource.Object(photos_bucket, existing_govid)
                old_govid.delete()
                logger.info('Delete success')
            except ClientError as e:
                logger.error(e)
        else:
            logger.info("didn't receive a new government id.")
    else:
        logger.info('No existing gov id to delete.')