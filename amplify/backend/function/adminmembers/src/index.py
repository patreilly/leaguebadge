import logging
# import base64
from datetime import datetime as dt, timezone
# from dateutil.relativedelta import relativedelta
# import pytz
# import time
import os
import json
# import uuid
# from urllib.parse import unquote
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
# from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
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
MEMBERSHIPS_TABLE_NAME = os.environ['STORAGE_MEMBERSHIPS_NAME']
MEMBERS_TABLE_NAME = os.environ['STORAGE_MEMBERS_NAME']
PLAYERS_TABLE_NAME = os.environ['STORAGE_PLAYERS_NAME']
PROGRAMS_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']
LEAGUE_TABLE_NAME = os.environ['STORAGE_LEAGUES_NAME']

ALLOWED_QUERY_PARAMS = ['league_id', 'program_id', 'membership_id', 'player_name', 'cloudfront_url']
ALLOWED_EXPORT_FORMATS = ['csv','json']
DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    username = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(':')[-1]
    
    if event['httpMethod'] == 'GET':
        if event['queryStringParameters']:
            logger.info('received params:', event['queryStringParameters'])
            members_result = ddb_get_members(
                leagues_table=LEAGUE_TABLE_NAME,
                players_table=PLAYERS_TABLE_NAME,
                programs_table=PROGRAMS_TABLE_NAME,
                memberships_table=MEMBERSHIPS_TABLE_NAME,
                members_table=MEMBERS_TABLE_NAME,
                query_filter_params=event['queryStringParameters'],
                user_id=username
            )
            result = members_result['body']
            status_code = members_result['statusCode']
        else:
            result = f"One of the following must be specified: {', '.join(ALLOWED_QUERY_PARAMS)}"
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
    :date_number    : decimal version of date YYYYMMDDHHMMSS.ssssss
    :from_format    : format of the date as received
    '''
    date_time = dt.strptime(str(date_number) + '+0000', from_format + '%z')
    return date_time.isoformat()


def clean_ddb_types(ddb_item, date_fields):
    """
    Converts Dynamo DB Decimals into python data types
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


def ddb_get_members(leagues_table, players_table, programs_table, memberships_table, members_table, query_filter_params, user_id):
    """
    returns list of member info based on a query string parameter name and value

    :params
    :leagues_table
    :programs_table
    :memberships_table
    :members_table
    :query_filter_params
    :user_id

    """
    print(f"query_filter_params: {query_filter_params}")
    members = []
    result = {}
    ddb_leagues_table = ddb_resource.Table(leagues_table)

    logger.info(f"Finding players using: {query_filter_params}")
    # get list of permitted leagues, programs, memberships
    league_perms = get_league_permissions(user_id, PLAYERS_TABLE_NAME)
    
    cloudfront_url = query_filter_params['cloudfront_url'] if 'cloudfront_url' in list(query_filter_params.keys()) else None

    if 'league_id' in list(query_filter_params.keys()):
        league_id = query_filter_params['league_id']
        if league_id in league_perms:
            logger.info(f'User permitted to query league {league_id}')
            members = get_members_by_league_id(
                league_id=league_id, 
                memberships_table=memberships_table, 
                members_table=members_table, 
                players_table=players_table, 
                cloudfront_url=cloudfront_url
            )
            result = {
                'statusCode': 200,
                'body': members
            }

        else:
            result = {
                'statusCode': 401,
                'body': 'Unauthorized'
            }

        return result
    elif 'program_id' in list(query_filter_params.keys()):
        result = {
            'statusCode': 501,
            'body': 'Query by program_id not supported'
        }
        return result
    elif 'membership_id' in list(query_filter_params.keys()):
        result = {
            'statusCode': 501,
            'body': 'Query by membership_id not supported'
        }
        return result
    elif 'player_name' in list(query_filter_params.keys()):
        result = {
            'statusCode': 501,
            'body': 'Query by player_name not supported'
        }
        return result
    else:
        logger.error(f"Query string parameter unrecognized: {query_filter_params}")
        result = {
            'statusCode': 401,
            'body': 'Unknown query parameter'
        }
        return result

    # try:
    #     for league_id in league_ids:
    #         ddb_response = ddb_table.query(
    #             TableName=membership_table,
    #             IndexName='ixleagueid',
    #             KeyConditionExpression=Key('leagueid').eq(league_id),
    #         )
    #         league_info = ddb_get_league_info(league_id=league_id, leagues_table=LEAGUES_TABLE_NAME )
    #         for membership in ddb_response['Items']:
    #             memberships_result = {}
    #             for k in membership:
    #                 if k in date_fields:
    #                     memberships_result[k] = convert_unix_ts(membership[k])
    #                 elif isinstance(membership[k], Decimal):
    #                     if membership[k] % 1 == 0:
    #                         memberships_result[k] = int(membership[k])
    #                     else:
    #                         memberships_result[k] = float(membership[k])
    #                 else:
    #                     memberships_result[k] = membership[k]
    #             memberships_result['league_info'] = league_info
    #             members.append(memberships_result)

    #     result['statusCode'] = 200
    #     result['body'] = members
    # except ClientError as e:
    #     error_code = e.response['Error']['Code']
    #     error_msg = e.response['Error']['Message']
    #     logger.error(e)
    #     result['statusCode'] = error_code
    #     result['body'] = "Something went wrong"

    return result


def get_league_permissions(user_id, player_table):
    """
    returns list of leagues, programs, memberships this person can view members of

    :param
    :user_id
    :players_table
    
    """
    player_table_ddb = ddb_resource.Table(player_table)
    logger.info(f"Getting permissions for user {user_id}")
    try:
        ddb_response = player_table_ddb.get_item(
            Key={
                'id': user_id
            }
        )
        logger.info(ddb_response)
        profile_response = ddb_response['Item']
        permissions = profile_response['league_admin']
    except ClientError as e:
        logger.error(e)
        permissions = []

    return permissions


def get_members_by_league_id(league_id, memberships_table, members_table, players_table, cloudfront_url=None):
    memberships_table_ddb = ddb_resource.Table(memberships_table)
    members_table_ddb = ddb_resource.Table(members_table)
    players_table_ddb = ddb_resource.Table(players_table)
    members = []
    try:
        
        ddb_response = memberships_table_ddb.query(
            TableName=memberships_table,
            IndexName="ixleagueid",
            KeyConditionExpression=Key('leagueid').eq(league_id),
            ProjectionExpression='id,programid'
        )

        for membership in ddb_response['Items']:
            members_response = members_table_ddb.query(
                TableName=members_table,
                IndexName="ixmembershipid",
                KeyConditionExpression=Key('membershipid').eq(membership['id'])
            )
            membership.pop('id', None)
            membership_info = membership
            for member in members_response['Items']:
                member_info = clean_ddb_types(
                        ddb_item=member, 
                        date_fields=date_fields
                    )
                
                player_info_response = players_table_ddb.get_item(
                    Key={
                        'id': member_info['playerid']
                        }
                    )

                player_info = clean_ddb_types(
                        ddb_item=player_info_response['Item'], 
                        date_fields=date_fields
                    )
                
                # Create full photo url
                if cloudfront_url:
                    player_info['profile_photo_url'] = f"{cloudfront_url}{player_info['avatarUrl']}"
                
                # remove sensitive data from player record
                player_info.pop('id', None)
                player_info.pop('league_admin', None)
                member_info.pop('playerid', None)
                
                members.append({**player_info, **member_info, **membership_info})


    except ClientError as e:
        logger.error(e)

    return members