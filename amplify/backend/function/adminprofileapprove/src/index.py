import json
import logging
import os
import time
from datetime import datetime as dt, timezone
from dateutil.relativedelta import relativedelta
import pytz
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

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

# env vars
PLAYERS_TABLE = os.environ['STORAGE_PLAYERS_NAME']
LEAGUES_TABLE = os.environ['STORAGE_LEAGUES_NAME']
MEMBERS_TABLE = os.environ['STORAGE_MEMBERS_NAME']
PROGRAMS_TABLE = os.environ['STORAGE_PROGRAMS_NAME']
MEMBER_HIST_TABLE = os.environ['STORAGE_MEMBERHISTORY_NAME']
PLAYERS_BUCKET = os.environ['STORAGE_PLAYERPHOTOS_BUCKETNAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    
    if event['httpMethod'] == 'PUT':
        if event['queryStringParameters']:
            logger.info('received params:', event['queryStringParameters'])
            query_string_params = event['queryStringParameters']
            approval_response = approve_player_profile(
                member_id=query_string_params['memberId'],
                members_table=MEMBERS_TABLE,
                players_table=PLAYERS_TABLE,
                profile_reviewer=query_string_params['approver']
            )
            result = approval_response['body']
            status_code = approval_response['statusCode']
        else:
            result = 'No approver or member id provided'
            status_code = 400
    else:
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}")
        result = 'Not Implemented'
        status_code = 501

    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET'
        },
        'body': json.dumps(result)
    }


def approve_player_profile(member_id, members_table, players_table, profile_reviewer):
    '''
    updates a player profile as approved using the member id

    :params
    :member_id
    '''
    members_table_ddb = ddb_resource.Table(members_table)
    players_table_ddb = ddb_resource.Table(players_table)

    try:
        members_response = members_table_ddb.get_item(
            Key={
                'id': member_id
            },
            ProjectionExpression='playerid'
        )
        if members_response['ResponseMetadata']['HTTPStatusCode'] == 200:
            player_id = members_response['Item']['playerid']

            get_player_response = players_table_ddb.get_item(
                Key={
                    'id': player_id
                },
                ProjectionExpression='govIdUrl'
            )

            if 'Item' in get_player_response.keys() and 'govIdUrl' in get_player_response['Item'].keys():
                delete_gov_id(
                    bucket=PLAYERS_BUCKET, 
                    s3Key=get_player_response['Item']['govIdUrl']
                    )
                players_table_ddb.update_item(
                    Key={
                        'id': player_id
                    },
                    UpdateExpression='REMOVE govIdUrl',
                    ReturnValues='NONE'
                )
                

            current_date_utc_int = get_current_datetime()

            expression_attribute_names = {
                    '#modified': 'modified',
                    '#profile_approval_status': 'profile_approval_status',
                    '#profile_reviewer': 'profile_reviewer'
                }

            expression_attribute_values = {
                    ':modified': str(current_date_utc_int),
                    ':profile_approval_status': 'VERIFIED',
                    ':profile_reviewer': profile_reviewer
                }

            update_expression = 'SET #modified = :modified, #profile_approval_status = :profile_approval_status, #profile_reviewer = :profile_reviewer'

            update_player_response = players_table_ddb.update_item(
                Key={
                    'id': player_id
                },
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                UpdateExpression=update_expression,
                ReturnValues='NONE'
            )

            # need to add removing government id 
            
            status_code = update_player_response['ResponseMetadata']['HTTPStatusCode']
            result = 'profile approved'
        else:
            logger.error(members_response)
            status_code = members_response['ResponseMetadata']['HTTPStatusCode']
            result = 'Something went wrong'
    except ClientError as e:
        status_code = 400
        result = 'Something went wrong'
        logger.error(e)

    return {
        'statusCode': status_code,
        'body': result
    }


def delete_gov_id(bucket, s3Key):
    '''
    Deletes the government id
    : params
    : bucket            :
    : s3Key             :
    '''
    try:
        logger.info(f"Deleting {s3Key} from bucket {bucket}...")
        old_photo = s3_resource.Object(bucket, s3Key)
        old_photo.delete()
        logger.info('Delete success')
    except ClientError as e:
        logger.error(f"Delete failed: {e}")


def get_current_datetime():
    '''
    Returns current date time in UTC formatted as YYYYMMDDHHMMSSssssss
    '''
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))