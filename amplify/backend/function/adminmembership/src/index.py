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

# env vars
MEMBERSHIPS_TABLE = os.environ['STORAGE_MEMBERSHIPS_NAME']
PROGRAMS_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'


def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
    membership_data = json.loads(event['body'])
    print('membership data', membership_data)
    result = {}
    status_code = 200

    if event['httpMethod'] == 'GET':
        membership_id = event['pathParameters']['membershipid']
        get_membership_response = ddb_get_membership(
            membership_id=membership_id,
            membership_table=MEMBERSHIPS_TABLE
        )
        result = {get_membership_response['body']}
        status_code = get_membership_response['statusCode']
    elif event['httpMethod'] == 'PUT':
        membership_id = event['pathParameters']['membershipid']
        if membership_id == 'undefined':
            result = f'membership undefined'
            status_code = 400
        else:
            update_membership_response = ddb_update_membership(
                membership_table=MEMBERSHIPS_TABLE,
                membership_data=membership_data,
                membership_id=membership_id
            )
            result = update_membership_response['body']
            status_code = update_membership_response['statusCode']
    elif event['httpMethod'] == 'POST':
        create_membership_response = ddb_create_membership(
            membership_table=MEMBERSHIPS_TABLE, 
            membership_data=membership_data
            )
        result = {"membershipId": create_membership_response['id']}
        status_code = create_membership_response['statusCode']
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
    :date_number    : integer version of date YYYYMMDDHHMMSS
    :from_format    : format of the date as received
    '''
    date_time = dt.strptime(str(date_number) + '+0000', from_format + '%z')
    return date_time.isoformat()


def generate_membership_id(memberships_table):
    """
    Generates a membership id that is unique
    """
    from string import ascii_letters, digits
    from random import choice

    membership_id = ''
    program_exists = True
    while program_exists == True:
        membership_id = ''.join([choice(ascii_letters + digits) for i in range(8)]).upper()
        check_membership_exists = ddb_client.get_item(
            TableName=memberships_table,
            Key={
                'id': {
                    'S': membership_id
                }
            }
        )
        if 'Item' in check_membership_exists.keys():
            logger.info(f"Duplicate program id {membership_id} found, trying again to regenerate.")
            program_exists = True
        else:
            program_exists = False

    return membership_id


def ddb_create_membership(membership_table, membership_data):
    """
    creates league record in leagues ddb table
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    try:
        ddb_table = ddb_resource.Table(membership_table)
        current_date_utc_int = get_current_datetime()
        excluded_fields = []
        excluded_fields = date_fields

        league_id = membership_data['programid'].split('-')[0]
        membership_id = generate_membership_id(membership_table)

        item = {
            'id': membership_id,
            'date_added': current_date_utc_int,
            'modified': current_date_utc_int,
            'leagueid': league_id
        }

        for e in excluded_fields:
            membership_data.pop(e, None)

        ddb_response = ddb_table.put_item(
            Item={**item, **membership_data},
            ReturnValues='NONE'
        )

        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = f'Membership {membership_id} created'
        return {
            'statusCode': status_code,
            'body': result,
            'id': membership_id
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'Something went wrong'
        }


def ddb_update_membership(membership_table, membership_data, membership_id):
    """
    updates program record
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """
    ddb_table = ddb_resource.Table(membership_table)
    try:
        current_date_utc_int = get_current_datetime()
        excluded_fields = []
        excluded_fields = date_fields
        excluded_fields.append('id')

        league_id = membership_data['programid'].split('-')[0]
        expression_attribute_names = {
                '#modified': 'modified',
                '#leagueid': 'leagueid'
            }

        expression_attribute_values = {
                ':modified': str(current_date_utc_int),
                ':leagueid': league_id
            }
        update_expression = 'SET #modified = :modified, #leagueid = :leagueid'

        for k in membership_data:
            if k not in excluded_fields:
                expression_attribute_names[f"#{k}"] = k
                expression_attribute_values[f":{k}"] = membership_data[k]
                if type(membership_data[k]) == dict:
                    update_expression+=f", #{k} = list_append(#{k} = :{k})"
                else:
                    update_expression+=f", #{k} = :{k}"

        ddb_response = ddb_table.update_item(
            Key={
                'id': membership_id
            },
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            UpdateExpression=update_expression,
            ReturnValues='NONE'
        )

        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = f'Membership {membership_id} updated'
        return {
            'statusCode': status_code,
            'body': result
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'error: membership did not update'
        }


def ddb_get_membership(membership_id, membership_table):
    """
    Takes a membership id and gets the info

    :params
    :membership_id
    :membership_table 

    """
    membership_result = {}
    result = {}
    membership_table_ddb = ddb_resource.Table(membership_table)

    try:
        ddb_response = membership_table_ddb.get_item(
            Key={
                'id': membership_id
            }
        )
        membership = ddb_response['Item']
        for k in membership:
            if k in date_fields:
                membership_result[k] = convert_to_iso_date(membership[k], DATE_FORMAT_DB)
            elif isinstance(membership[k], Decimal):
                if membership[k] % 1 == 0:
                    membership_result[k] = int(membership[k])
                else:
                    membership_result[k] = float(membership[k])
            else:
                membership_result[k] = membership[k]

        membership_result['program_info'] = ddb_get_program(membership['programid'], PROGRAMS_TABLE_NAME)

        result['statusCode'] = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result['body'] = membership_result
        print(result)
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = error_code
        result['body'] = "Something went wrong"

    return result


def ddb_get_program(program_id, program_table):
    """
    Takes a membership id and gets the info

    :params
    :membership_id
    :membership_table 

    """
    program_result = {}
    result = {}
    program_table_ddb = ddb_resource.Table(program_table)

    try:
        ddb_response = program_table_ddb.get_item(
            Key={
                'id': program_id
            }
        )
        program = ddb_response['Item']
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

        result['statusCode'] = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result['body'] = program_result
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = error_code
        result['body'] = "Something went wrong"

    return result