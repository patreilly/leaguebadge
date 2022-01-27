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
MEMBERS_TABLE = os.environ['STORAGE_MEMBERS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event: ')
    logger.info(event)

    if event['httpMethod'] == 'PUT':
        member_id = event['pathParameters']['memberid']
        payload = json.loads(event['body'])
        update_player_response = update_member_status(
            payload=payload,
            member_id=member_id,
            members_table=MEMBERS_TABLE
        )
        result = update_player_response['body']
        status_code = update_player_response['statusCode']
    else:
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}")
        result = 'Not Implemented'
        status_code = 501
  
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        'body': json.dumps(result)
    }


def update_member_status(member_id, payload, members_table):
    result = {}
    try:
        ddb_table = ddb_resource.Table(members_table)
        current_date_utc_int = get_current_datetime()
        excluded_fields = []
        excluded_fields = date_fields

        expression_attribute_names = {
                '#modified': 'modified'
            }

        expression_attribute_values = {
                ':modified': str(current_date_utc_int)
            }

        update_expression = 'SET #modified = :modified'

        for k in payload:
            if k not in excluded_fields:
                expression_attribute_names[f"#{k}"] = k
                expression_attribute_values[f":{k}"] = payload[k]
                if type(payload[k]) == dict:
                    update_expression+=f", #{k} = list_append(#{k} = :{k})"
                else:
                    update_expression+=f", #{k} = :{k}"

        ddb_response = ddb_table.update_item(
            Key={
                'id': member_id
            },
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            UpdateExpression=update_expression,
            ReturnValues='NONE'
        )
        
        result['statusCode'] = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result['body'] = f"Member {member_id} updated successfully."
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(e)
        result['statusCode'] = 400
        result['body'] = f"{error_code}: {error_msg}"

    return result


def get_current_datetime():
    '''
    Returns current date time in UTC formatted as YYYYMMDDHHMMSSssssss
    '''
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))