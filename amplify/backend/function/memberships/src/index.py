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
# from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from boto3.dynamodb.conditions import Key

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')

date_fields = ['modified','date_added'] # we never take these fields from a payload -

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
MEMBERSHIPS_TABLE = os.environ['STORAGE_MEMBERSHIPS_NAME']
PROGRAMS_TABLE = os.environ['STORAGE_PROGRAMS_NAME']
LEAGUES_TABLE = os.environ['STORAGE_LEAGUES_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    result = {}
    status_code = 200
    if event['httpMethod'] == 'GET':
        # username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
        get_membership_response = ddb_get_memberships(
            membership_table=MEMBERSHIPS_TABLE
        )
        result = get_membership_response['body']
        status_code = get_membership_response['statusCode']
    else:
        result = 'Method Not Allowed'
        status_code=405
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}. Throwing 405 error")
  
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,GET'
        },
        'body': json.dumps(result)
    }


def convert_to_iso_date(date_number, from_format):
    '''
    returns ISO formatted date time string

    :params
    :date_number    : integer version of date YYYYMMDDHHMMSS.ssssss
    :from_format    : format of the date as received
    '''
    date_time = dt.strptime(str(date_number) + '+0000', from_format + '%z')
    return date_time.isoformat()


def ddb_get_memberships(membership_table):
    """
    Returns all active memberships 

    :params
    :league_id
    :membership_table 

    """
    memberships = []
    result = {}
    ddb_memberships_table = ddb_resource.Table(membership_table)

    try:
        active_memberships_response = ddb_memberships_table.query(
            TableName=membership_table,
            IndexName='ixispublic',
            KeyConditionExpression=Key('isPublic').eq(1),
        )
        logger.info(active_memberships_response)
        # league_info = ddb_get_league_info(league_id=league_id, leagues_table=LEAGUES_TABLE_NAME )
        for membership in active_memberships_response['Items']:
            memberships_result = {}
            for k in membership:
                if k in date_fields:
                    memberships_result[k] = convert_to_iso_date(membership[k], DATE_FORMAT_DB)
                elif isinstance(membership[k], Decimal):
                    if membership[k] % 1 == 0:
                        memberships_result[k] = int(membership[k])
                    else:
                        memberships_result[k] = float(membership[k])
                else:
                    memberships_result[k] = membership[k]
            memberships_result['league_info'] = ddb_get_league_info(memberships_result['leagueid'], LEAGUES_TABLE)
            memberships_result['program_info'] = ddb_get_program_info(memberships_result['programid'], PROGRAMS_TABLE)
            memberships.append(memberships_result)
        logger.info('')
        result['statusCode'] = 200
        result['body'] = memberships
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = error_code
        result['body'] = "Something went wrong"

    return result


def ddb_get_league_info(league_id, leagues_table):
    """
    get info about league

    :params
    :league_id
    :leagues_table 

    """
    result = {}
    ddb_table = ddb_resource.Table(leagues_table)

    try:
        ddb_response = ddb_table.get_item(
            Key={
                'id': league_id
            }
        )
        if 'Item' in ddb_response.keys():
            league = ddb_response['Item']
            for k in league:
                if k in date_fields:
                    result[k] = convert_to_iso_date(league[k], DATE_FORMAT_DB)
                elif isinstance(league[k], Decimal):
                    if league[k] % 1 == 0:
                        result[k] = int(league[k])
                    else:
                        result[k] = float(league[k])
                else:
                    result[k] = league[k]
        else:
            result = {}
        result.pop('modified')
        result.pop('date_added')
        result.pop('isPublic')
    except ClientError as e:
        logger.error(e.response)
        result = {}

    return result


def ddb_get_program_info(program_id, programs_table):
    """
    get info about league

    :params
    :program_id
    :leagues_table 

    """
    result = {}
    ddb_table = ddb_resource.Table(programs_table)

    try:
        ddb_response = ddb_table.get_item(
            Key={
                'id': program_id
            }
        )
        if 'Item' in ddb_response.keys():
            league = ddb_response['Item']
            for k in league:
                if k in date_fields:
                    result[k] = convert_to_iso_date(league[k], DATE_FORMAT_DB)
                elif isinstance(league[k], Decimal):
                    if league[k] % 1 == 0:
                        result[k] = int(league[k])
                    else:
                        result[k] = float(league[k])
                else:
                    result[k] = league[k]
        else:
            result = {}
        result.pop('modified')
        result.pop('date_added')
        result.pop('isPublic')
    except ClientError as e:
        logger.error(e.response)
        result = {}

    return result