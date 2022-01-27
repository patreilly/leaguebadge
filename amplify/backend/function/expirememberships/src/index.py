import logging
# import base64
from datetime import datetime as dt, timezone
# from dateutil.relativedelta import relativedelta
# import pytz
import time
import os
import json
# import uuid
# from urllib.parse import unquote
# import pytz
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
# from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
# from boto3.dynamodb.conditions import Key, Attr

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')

date_fields = ['modified','date_added'] # we never take these fields from a payload -

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
MEMBERS_TABLE_NAME = os.environ['STORAGE_MEMBERS_NAME']

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):

    members_table = MEMBERS_TABLE_NAME
    members_table_ddb = ddb_resource.Table(members_table)
    statuses_to_check = ['PENDING','SUSPENDED','ELIGIBLE','ACTIVE']
    try:
            
        current_date_utc_int = get_current_datetime()
        
        expired_members = []
        logger.info(f'Looking for expiration dates older than {current_date_utc_int}')

        expression_attribute_names = {
                '#member_status': 'status',
                '#expiration_date': 'expiration_date'
            }

        for status in statuses_to_check:
            logger.info(f"Checking status {status}")
            expression_attribute_values = {
                    ':status': status, 
                    ':current_timestamp': current_date_utc_int
                }
            query_response = members_table_ddb.query(
                IndexName='ixstatus',
                KeyConditionExpression='#member_status = :status And #expiration_date < :current_timestamp',
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ProjectionExpression='id, expiration_date',
                ReturnConsumedCapacity='TOTAL'
            )
            if query_response['Count'] > 0: # TODO account for pagination using last evaluated key
                expired_members.extend(query_response['Items'])

        # update statuses to expired
        expression_attribute_names = {
                '#status': 'status',
                '#status_desc': 'status_desc',
                '#modified': 'modified',
            }

        expression_attribute_values = {
                ':status': 'EXPIRED',
                ':status_desc': 'Membership has expired',
                ':modified': str(current_date_utc_int),
            }
        update_expression = 'SET #modified = :modified, #status = :status, #status_desc = :status_desc'

        for member in expired_members:
            logger.info(f"Expiring member {member['id']}")
            members_table_ddb.update_item(
                Key={
                    'id': member['id']
                },
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                UpdateExpression=update_expression,
                ReturnValues='NONE'
            )


        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps(f"Members successfully updated")
        }
        
    except ClientError as e:
        logger.error(e)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps('Something went wrong')
        }


def get_current_datetime():
    '''
    Returns current date time in UTC formatted as YYYYMMDDHHMMSSssssss
    '''
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))