import logging
# import base64
from datetime import datetime as dt, timezone
from dateutil.relativedelta import relativedelta
import pytz
import time
import os
import json
import uuid
from urllib.parse import unquote
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
# from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
# from boto3.dynamodb.conditions import Key

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')

date_fields = ['modified','date_added', 'expiration_date'] # we never take these fields from a payload -

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
MEMBERSHIPS_TABLE_NAME = os.environ['STORAGE_MEMBERSHIPS_NAME']
MEMBERS_TABLE_NAME = os.environ['STORAGE_MEMBERS_NAME']
PLAYERS_TABLE_NAME = os.environ['STORAGE_PLAYERS_NAME']
PROGRAMS_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    data = json.loads(event['body'])
    result = {}
    status_code = 200

    if event['httpMethod'] == 'POST':
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}")
        result = 'Not Implemented'
        status_code = 501
        # league_name = 'test league name'
        # player_id = 'test player id'
        # membership_id = 'test membership id'
        # try:
        #     # update player profile status: 

        #     player_update_response = ddb_update_player_profile_status(
        #         players_table=PLAYERS_TABLE_NAME, 
        #         data={
        #                 "profile_approval_status": "PENDING_REVIEW", 
        #                 "profile_reviewer": league_name
        #             }, 
        #         player_id=player_id
        #         )

        #     # creat member record 
        #     create_member_response = ddb_create_member(
        #         memberships_table=MEMBERSHIPS_TABLE_NAME, 
        #         members_table=MEMBERS_TABLE_NAME, 
        #         players_table=PLAYERS_TABLE_NAME, 
        #         programs_table=PROGRAMS_TABLE_NAME,
        #         membership_id=membership_id, 
        #         player_id=player_id
        #     )
        #     result = {"memberId": create_member_response['id']}
        #     status_code = create_member_response['statusCode']
        # except ClientError as e:
        #     logger.error(e)

    elif event['httpMethod'] == 'GET':
        member_id = event['pathParameters']['id']
        get_member_result = ddb_get_member(
            member_id=member_id,
            members_table=MEMBERS_TABLE_NAME
        )
        status_code=get_member_result['statusCode']
        result = get_member_result['body']
    else:
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}")
        result = 'Not Implemented'
        status_code = 501
        
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, GET'
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


def ddb_get_member(member_id, members_table):
    """
    Takes a member id and gets the info

    :params
    :member_id
    :members_table 

    """
    member_result = {}
    result = {}
    members_table_ddb = ddb_resource.Table(members_table)

    try:
        ddb_response = members_table_ddb.get_item(
            Key={
                'id': member_id
            }
        )
        program = ddb_response['Item']
        for k in program:
            if k in date_fields:
                member_result[k] = convert_to_iso_date(program[k], DATE_FORMAT_DB)
            elif isinstance(program[k], Decimal):
                if program[k] % 1 == 0:
                    member_result[k] = int(program[k])
                else:
                    member_result[k] = float(program[k])
            else:
                member_result[k] = program[k]

        result['statusCode'] = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result['body'] = member_result
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = error_code
        result['body'] = "Something went wrong"

    return result

