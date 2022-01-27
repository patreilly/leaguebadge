import logging
# import base64
from datetime import datetime as dt, timezone
import pytz
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
from boto3.dynamodb.conditions import Key

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')

date_fields = ['modified','date_added'] # we never take these fields from a payload -

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
PROGRAMS_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
    program_data = json.loads(event['body'])
    print('program data', program_data)
    result = {}
    status_code = 200
    if event['httpMethod'] == 'GET':
        program_id = event['pathParameters']['programid']
        get_program_response = ddb_get_program(
            program_id=program_id,
            program_table=PROGRAMS_TABLE_NAME
        )
        result = {get_program_response['body']}
        status_code = get_program_response['statusCode']
    elif event['httpMethod'] == 'PUT':
        program_id = event['pathParameters']['programid']
        update_program_response = ddb_update_program(
            program_table=PROGRAMS_TABLE_NAME,
            program_data=program_data,
            program_id=program_id
        )
        result = update_program_response['body']
        status_code = update_program_response['statusCode']
    elif event['httpMethod'] == 'POST':
        create_program_response = ddb_create_program(
            program_table=PROGRAMS_TABLE_NAME, 
            program_data=program_data, 
            username=username
            )
        result = {"programId": create_program_response['id']}
        status_code = create_program_response['statusCode']
    else:
        result = f"HTTP method {event['httpMethod']} not supported yet: {event}"
        logger.error(result)

    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps(result)
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


def generate_program_id(league_id, program_table):
    """
    Generates a random 6 character alphanumeric league id that is unique
    """
    from string import ascii_letters, digits
    from random import choice

    program_id = ''
    program_exists = True
    while program_exists == True:
        program_id = league_id + '-' + ''.join([choice(ascii_letters + digits) for i in range(3)]).upper()
        check_program_exists = ddb_client.get_item(
            TableName=program_table,
            Key={
                'id': {
                    'S': program_id
                }
            }
        )
        if 'Item' in check_program_exists.keys():
            logger.info(f"Duplicate program id {program_id} found, trying again to regenerate.")
            program_exists = True
        else:
            program_exists = False

    return program_id


def ddb_create_program(program_table, program_data, username):
    """
    creates league record in leagues ddb table
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    try:
        serializer = TypeSerializer()
        # data_to_serialize = {}
        league_id = program_data['leagueid']
        program_id = generate_program_id(league_id, program_table)
        serialized_data = {k: serializer.serialize(v) for k,v in program_data.items()}
        current_date_utc_int = get_current_datetime()

        mandatory_fields = {
            'date_added': { 
                'N': str(current_date_utc_int)
            },
            'modified': {
                'N': str(current_date_utc_int)
            },
            'id': {
                'S': program_id
            },
        }

    
        # shallow merge of dicts
        item = {**mandatory_fields, **serialized_data}

        ddb_response = ddb_client.put_item(
            TableName=program_table,
            Item=item,
            ConditionExpression='attribute_not_exists(id)',
            ReturnValues='NONE'
        )
        # logger.info(ddb_response)
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        
        # update_player_response = ddb_update_player(player_table, username, program_id)
        # status_code = update_player_response['statusCode']
        result = f'League {program_id} created'
        return {
            'statusCode': status_code,
            'body': result,
            'id': program_id
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'Something went wrong'
        }


def ddb_update_program(program_table, program_data, program_id):
    """
    updates program record
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    ddb_table = ddb_resource.Table(program_table)
    try:
        current_date_utc_int = get_current_datetime()
        excluded_fields = []
        excluded_fields = date_fields
        excluded_fields.append('id')
        expression_attribute_names = {
                '#modified': 'modified',
            }

        expression_attribute_values = {
                ':modified': str(current_date_utc_int),
            }
        update_expression = 'SET #modified = :modified'

        for k in program_data:
            if k not in excluded_fields:
                expression_attribute_names[f"#{k}"] = k
                expression_attribute_values[f":{k}"] = program_data[k]
                if type(program_data[k]) == dict:
                    update_expression+=f", #{k} = list_append(#{k} = :{k})"
                else:
                    update_expression+=f", #{k} = :{k}"

        ddb_response = ddb_table.update_item(
            Key={
                'id': program_id
            },
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            UpdateExpression=update_expression,
            ReturnValues='NONE'
        )

        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = f'Program {program_id} updated'
        return {
            'statusCode': status_code,
            'body': result
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'error: program did not update'
        }


def ddb_get_program(program_id, program_table):
    """
    Takes a league id and gets the its program info

    :params
    :league_ids         :list of league ids
    :program_table       :leagues dynamodb table
    """
    program_result = {}
    result = {}
    program_table_ddb = ddb_resource.Table(program_table)

    try:
        ddb_response = program_table_ddb.query(
            TableName=program_table,
            KeyConditionExpression=Key('id').eq(program_id),
        )
        program = ddb_response['Items'][0]
        for k in program:
            if k in date_fields:
                program_result[k] = convert_to_iso_date(program[k], DATE_FORMAT_DB)
            elif isinstance(program[k], Decimal):
                if program[k] % 1 == 0:
                    program_result[k] = int(program[k])
                else:
                    program_result[k] = float(program[k])
            else:
                program_result[k] = program[k]

        result['statusCode'] = 200
        result['body'] = program_result
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result