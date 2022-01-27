import json
import logging
import time
from datetime import datetime as dt, timezone
import os
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from boto3.dynamodb.conditions import Key
import uuid
from urllib.parse import unquote
from decimal import Decimal

# STORAGE_LEAGUES_ARN
# STORAGE_LEAGUES_NAME
# STORAGE_MEMBERSHIPS_ARN
# STORAGE_MEMBERSHIPS_NAME
# STORAGE_PLAYERS_ARN
# STORAGE_PLAYERS_NAME
# STORAGE_PROGRAMS_ARN
# STORAGE_PROGRAMS_NAME

# env vars
LEAGUE_TABLE_NAME = os.environ['STORAGE_LEAGUES_NAME']
STORAGE_PLAYERS_NAME = os.environ['STORAGE_PLAYERS_NAME']
CLOUDFRONT_PREFIX = 'cloudfront'

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')
s3_resource = boto3.resource('s3')


# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'


def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    status_code = 200
    result = {}
    for record in event['Records']:
        src_bucket = record['s3']['bucket']['name']
        src_key = unquote(record['s3']['object']['key'])

        try:
            if src_key.startswith('public/logos'):
                logger.info('Processing a logo')
                league_id = src_key.split('/')[2]
                existing_logo = get_current_logo(league_id, LEAGUE_TABLE_NAME)
                try:
                    if existing_logo != '':
                        # delete existing object from cloudfront prefix
                        old_logo = f"{CLOUDFRONT_PREFIX}/{existing_logo}"
                        logger.info(f'Deleting old logo: {old_logo}')
                        delete_object(bucket=src_bucket, key=f"{old_logo}")
                
                    logger.info(f'Copying object: {src_key}')
                    random_guid = str(uuid.uuid4())
                    file_ext = src_key.split('/')[3].split('.')[1]
                    new_key = f'logos/{random_guid}.{file_ext}'

                    bucket = s3_resource.Bucket(src_bucket)
                    obj = bucket.Object(f"{CLOUDFRONT_PREFIX}/{new_key}")
                    copy_source = {
                        'Bucket': src_bucket,
                        'Key': src_key
                    }
                    obj.copy(copy_source)
                    ddb_update_response = ddb_update_league(LEAGUE_TABLE_NAME, {'logo_url': new_key }, league_id)
                    status_code = ddb_update_response['statusCode']
                    result = ddb_update_response['body']
                except Exception as e:
                    logger.error(e)
                    status_code = 400
                    result = e;
            elif src_key.startswith('private/'):
                logger.info('hit the private logic')
                key_array = src_key.split('/')
                if 'profilephoto' in key_array:
                    logger.info('Processing a profile photo')
                    # get file name 
                    player_id = key_array[-1].split('.')[0]
                    logger.info(f"player id: {player_id}")

                    current_profile_photo = get_current_profile_photo(player_id, STORAGE_PLAYERS_NAME)
                    if current_profile_photo != '':
                        old_photo = f"{CLOUDFRONT_PREFIX}/{current_profile_photo}"
                        logger.info(f'Deleting old photo: {old_photo}')
                        delete_object(bucket=src_bucket, key=f"{old_photo}")

                    random_guid = str(uuid.uuid4())
                    file_ext = src_key.split('/')[-1].split('.')[1]
                    logger.info(f"file extension: {file_ext}")
                    new_key = f'profilephotos/{random_guid}.{file_ext}'

                    bucket = s3_resource.Bucket(src_bucket)
                    obj = bucket.Object(f"{CLOUDFRONT_PREFIX}/{new_key}")
                    copy_source = {
                        'Bucket': src_bucket,
                        'Key': src_key
                    }
                    logger.info(f'Copying source bucket: {src_bucket}, source key: {src_key} to {CLOUDFRONT_PREFIX}/{new_key}')
                    obj.copy(copy_source)

                    ddb_update_response = ddb_update_player_photo(STORAGE_PLAYERS_NAME, new_key, player_id)
                    status_code = ddb_update_response['statusCode']
                    result = ddb_update_response['body']

                if 'governmentid' in key_array:
                    logger.info('Processing a government id')
                    # get file name 
                    player_id = key_array[-1].split('.')[0]
                    current_gov_id = get_current_gov_id(player_id, STORAGE_PLAYERS_NAME)
                    if current_gov_id != '':
                        old_photo = f"{CLOUDFRONT_PREFIX}/{current_gov_id}"
                        logger.info(f'Deleting old photo: {old_photo}')
                        delete_object(bucket=src_bucket, key=f"{old_photo}")

                    logger.info(f'Copying object: {src_key}')
                    random_guid = str(uuid.uuid4())
                    file_ext = src_key.split('/')[-1].split('.')[1]
                    new_key = f'governmentids/{random_guid}.{file_ext}'

                    bucket = s3_resource.Bucket(src_bucket)
                    obj = bucket.Object(f"{CLOUDFRONT_PREFIX}/{new_key}")
                    copy_source = {
                        'Bucket': src_bucket,
                        'Key': src_key
                    }
                    obj.copy(copy_source)
                    ddb_update_response = ddb_update_player_gov_id(STORAGE_PLAYERS_NAME, new_key, player_id)
                    status_code = ddb_update_response['statusCode']
                    result = ddb_update_response['body']
                    
            else:
                logger.info(f"No bucket rules apply to : {record['s3']['object']['key']}")
        except Exception as e:
            status_code=400
            result='An error occurred.'
            logger.error(e)
  
    return {
        'statusCode': status_code,
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


def delete_object(bucket, key):
    bucket = s3_resource.Bucket(bucket)
    obj = bucket.Object(key)
    obj.delete()


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


def ddb_update_player_photo(player_table, s3_key, player_id):
    """
    updates player avatar url
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """

    utc_datetime = get_current_datetime()
    ddb_table = ddb_resource.Table(player_table)

    try:

        ddb_response = ddb_table.update_item(
            Key={
                'id': player_id
            },
            UpdateExpression='SET avatarUrl = :s3_key, modified = :modified',
            ExpressionAttributeValues={
                ':s3_key' : s3_key,
                ':modified': str(utc_datetime)
            }
        )
        return {
            'statusCode': ddb_response['ResponseMetadata']['HTTPStatusCode'],
            'body': 'Success'
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'error: player did not update'
        }


def ddb_update_player_gov_id(player_table, s3_key, player_id):
    """
    updates player gov id url
    :params
    :data               : payload from api gateway
    :table              : the name of the ddb table
    """

    current_date_utc_int = get_current_datetime()
    ddb_table = ddb_resource.Table(player_table)

    try:

        ddb_response = ddb_table.update_item(
            Key={
                'id': player_id
            },
            UpdateExpression='SET govIdUrl = :s3_key, modified = :modified',
            ExpressionAttributeValues={
                ':s3_key' : s3_key,
                ':modified': str(current_date_utc_int)
            }
        )
        return {
            'statusCode': ddb_response['ResponseMetadata']['HTTPStatusCode'],
            'body': 'Success'
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        return {
            'statusCode': status_code,
            'body': 'error: player did not update'
        }


def get_current_logo(league_id, league_table):
    """
    returns league info based on league id
    :params
    :leagueid
    :league_table
    """

    # result = {}
    
    try:
        ddb_response = ddb_client.get_item(
            TableName=league_table,
            Key={
                'id': {
                    'S': league_id
                }
            },
            AttributesToGet=[
                'logo_url',
            ],
        )

    except ClientError as e:
        # error_code = e.response['Error']['Code']
        # error_msg = e.response['Error']['Message']
        logger.error(e)
    else:
        d = TypeDeserializer()
        if ddb_response['Item']:
            deserialized = {k: d.deserialize(v) for k, v in ddb_response.get("Item").items()}
            return deserialized['logo_url']
        else:
            return ''


def get_current_profile_photo(player_id, player_table):
    """
    returns avatar url for player
    :params
    :id             : player id/username
    :player_table   : dynamodb table name
    """

    result = ''
    ddb_table = ddb_resource.Table(player_table)
    try:
        ddb_response = ddb_table.query(
            TableName=player_table,
            KeyConditionExpression=Key('id').eq(player_id),
            ProjectionExpression='avatarUrl'
        )
    except ClientError as e:
        # error_code = e.response['Error']['Code']
        # error_msg = e.response['Error']['Message']
        logger.error(e)
    else:
        if len(ddb_response['Items']) > 0:
            result = ddb_response['Items'][0]['avatarUrl']
        else:
            result = ''

    return result


def get_current_gov_id(player_id, player_table):
    """
    returns gov id url for player
    :params
    :id             : player id/username
    :player_table   : dynamodb table name
    """

    result = ''
    try:
        ddb_players_table = ddb_resource.Table(player_table)
        ddb_response = ddb_players_table.get_item(
            TableName=player_table,
            Key={
                'id': player_id
            },
            ProjectionExpression='govIdUrl',
        )

        logger.info(ddb_response)
    except ClientError as e:
        # error_code = e.response['Error']['Code']
        # error_msg = e.response['Error']['Message']
        logger.error(e)
    else:
        if ddb_response['Item']:
            result = ddb_response['Item']['govIdUrl']
        else:
            result = ''

    return result