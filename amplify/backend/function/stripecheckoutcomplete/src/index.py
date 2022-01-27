import json
import logging
import os
import time
from datetime import datetime as dt, timezone
from dateutil.relativedelta import relativedelta
import pytz
from decimal import Decimal
import boto3
import stripe
from botocore.exceptions import ClientError

ddb_client = boto3.client('dynamodb')
ssm_client = boto3.client('ssm')
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

#env vars
CHECKOUT_SESSIONS_TABLE = os.environ['STORAGE_STRIPECHECKOUTSESSIONS_NAME']
MEMBERSHIPS_TABLE_NAME = os.environ['STORAGE_MEMBERSHIPS_NAME']
MEMBERS_TABLE = os.environ['STORAGE_MEMBERS_NAME']
PLAYERS_TABLE = os.environ['STORAGE_PLAYERS_NAME']
PROGRAMS_TABLE_NAME = os.environ['STORAGE_PROGRAMS_NAME']
LEAGUES_TABLE_NAME = os.environ['STORAGE_LEAGUES_NAME']

STRIPE_SECRET_KEY = ssm_client.get_parameter(Name='stripe-secret-key-test',WithDecryption=True)['Parameter']['Value']
ENDPOINT_SIGNING_SECRET = ssm_client.get_parameter(Name='stripe-webhook-signing-secret',WithDecryption=True)['Parameter']['Value']

stripe.api_key = STRIPE_SECRET_KEY

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    print('received event:')
    print(event)
    checkout_session_data_dict = json.loads(event['body'])
    checkout_session_data_raw = event['body']

    if event['httpMethod'] == 'POST':
        checkout_complete_data_type = checkout_session_data_dict['type']
        if checkout_complete_data_type == 'checkout.session.completed':
            logger.info('checkout complete event received.')
            stripe_signature = event['headers']['Stripe-Signature']

            logger.info(f'checkout session data {checkout_session_data_raw}')
            logger.info(f'checking signature {stripe_signature}')
            logger.info(f'endpoint signing secret {ENDPOINT_SIGNING_SECRET}')
            
            sig_verified = verify_stripe_signature(
                payload=checkout_session_data_raw,
                sig_header=stripe_signature,
                endpoint_secret=ENDPOINT_SIGNING_SECRET
            )
            if sig_verified['statusCode'] == 200:
                cs_id = checkout_session_data_dict['data']['object']['id']
                checkout_details = get_checkout_session_details(
                    cs_id=cs_id,
                    checkout_session_table=CHECKOUT_SESSIONS_TABLE
                )
                logger.info(f"checkout details {checkout_details}")

                if checkout_details['statusCode'] == 200:
                    player_id = checkout_details['body']['player_id']
                    membership_id = checkout_details['body']['membership_id']
                    selected_cards = checkout_details['body']['selected_cards']
                    league_id = ddb_get_league_id(
                        leagues_table=LEAGUES_TABLE_NAME,
                        membership_id=membership_id, 
                        memberships_table=MEMBERSHIPS_TABLE_NAME,
                    )['body']
                    
                    try:
                        # update profile to pending
                        player_update_response = ddb_update_player_profile_status(
                            players_table=PLAYERS_TABLE, 
                            data={
                                    "profile_approval_status": "PENDING_REVIEW", 
                                    "profile_reviewer": league_id
                                }, 
                            player_id=player_id
                            )
                        logger.info(player_update_response)

                        if player_update_response['statusCode'] == 200:
                            # creat member record 
                            create_member_response = ddb_create_member(
                                memberships_table=MEMBERSHIPS_TABLE_NAME,
                                members_table=MEMBERS_TABLE,
                                programs_table=PROGRAMS_TABLE_NAME,
                                membership_id=membership_id,
                                player_id=player_id,
                                selected_cards=selected_cards
                            )
                            
                            result = {"memberId": create_member_response['id']}
                            status_code = create_member_response['statusCode']
                        else:
                            result = {"Unable to update player status. Member not created."}
                            status_code = player_update_response['ResponseMetadata']['HTTPStatusCode']
                            logger.error()
                    except ClientError as e:
                        logger.error(e)
                        result = "Something went wrong"
                        status_code = 500
                else:
                    logger.error(checkout_details)
                    result = checkout_details
            else:
                status_code = 400
                result = 'Stripe signature invalid'
            status_code = 200
            result = 'success'
        else:
            status_code = 400
            result = f'Unknown type of: {checkout_complete_data_type}'
    else:
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}")
        result = 'Not Implemented'
        status_code = 501

    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST'
        },
        'body': json.dumps(result)
    }


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


def get_checkout_session_details(cs_id, checkout_session_table):
    ddb_table = ddb_resource.Table(checkout_session_table)
    try:
        ddb_response = ddb_table.get_item(
            Key={
                'cs_id': cs_id
            }
        )
        logger.info(ddb_response)
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        body = ddb_response['Item']
    except ClientError as e:
        logger.error(e)
        status_code = 400
        body = 'Something went wrong'

    return {
        'statusCode': status_code,
        'body': body
    }


def verify_stripe_signature(payload, sig_header, endpoint_secret):
    status_code = None
    try:
        stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        status_code = 200
        logger.info("stipe signature is valid")
    except ValueError as e:
        logger.error("ValueError: {e}")
        status_code = 400
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"SignatureVerificationError: {e}")
        status_code = 400

    return {
        'statusCode': status_code,
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


def calculate_membership_expiration_date(membership_info, effective_date, date_format):
    '''
    Returns a formatted expiration date as decimal
    '''
    formatted_eff_date = dt.strptime(str(effective_date), date_format)
    if('membershipEndDate' in membership_info.keys()):
        exp_date = dt.strptime(membership_info['membershipEndDate'] + '+0000', '%m/%d/%Y%z')
    else:
        duration_basis = membership_info['membershipDurationBasis']
        duration_amount = membership_info['membershipDurationAmt']
        if duration_basis == 'years':
            exp_date = formatted_eff_date + relativedelta(years=duration_amount)
        elif duration_basis == 'weeks':
            exp_date = formatted_eff_date + relativedelta(weeks=duration_amount)
        elif duration_basis == 'months':
            exp_date = formatted_eff_date + relativedelta(months=duration_amount)
        elif duration_basis == 'days':
            exp_date = formatted_eff_date + relativedelta(days=duration_amount)
        elif duration_basis == 'hours':
            exp_date = formatted_eff_date + relativedelta(hours=duration_amount)
    
    return Decimal(exp_date.strftime(date_format))


def calculate_membership_effective_date(membership_info, date_format):
    '''
    Returns a formatted effective date as decimal
    '''
    current_time = dt.now(timezone.utc)
    program_effective_date = dt.strptime(membership_info['program_info']['body']['programEffectiveDate'] + '+0000', '%m/%d/%Y%z')
    if(current_time > program_effective_date):
        return Decimal(current_time.strftime(date_format))
    else:
        return Decimal(program_effective_date.strftime(date_format))


def ddb_create_member(memberships_table, members_table, programs_table, membership_id, player_id, selected_cards):
    """
    creates member for a given membership
    :params
    :memberships_table
    :membership_id
    :player_id
    """

    membership_info = ddb_get_membership(
        membership_id=membership_id, 
        membership_table=memberships_table,
        programs_table=programs_table
    )


    try:
        member_id = generate_member_id(memberships_table)

        current_date_utc_int = get_current_datetime()
        # temp_status_exp_date = unix_ts_gmt_datetime + relativedelta(days=10)
        eff_date = calculate_membership_effective_date(membership_info['body'], DATE_FORMAT_DB)
        exp_date = calculate_membership_expiration_date(membership_info['body'], eff_date, DATE_FORMAT_DB)

        item = {
            'id': member_id,
            'playerid': player_id,
            'date_added': current_date_utc_int,
            'modified': current_date_utc_int,
            'membershipid': membership_id,
            'registration_date': current_date_utc_int,
            'effective_date': eff_date,
    #         'expiration_date': exp_date.strftime(date_format),
            'expiration_date': exp_date,
            'status': 'PENDING',
            'status_desc': 'Awaiting approval of profile by league administrator',
            'selected_cards': selected_cards
            # 'temp_status': 'PENDING',
            # 'temp_status_desc': 'awaiting approval',
            # 'temp_status_exp': temp_status_exp_date.strftime(date_format)
        }

        ddb_table = ddb_resource.Table(members_table)
        ddb_response = ddb_table.put_item(
            Item=item,
            ReturnValues='NONE'
        )
        logger.info(ddb_response)
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = {
            'statusCode': status_code,
            'body': member_id,
            'id': member_id
        }
    except ClientError as e:
        logger.error(e.response)
        status_code = 400
        result = {
            'statusCode': status_code,
            'body': 'Something went wrong'
        }

    return result


def generate_member_id(memberships_table):
    """
    Generates a random 6 character alphanumeric id that is unique
    """
    from string import ascii_letters, digits
    from random import choice

    member_id = ''
    program_exists = True
    while program_exists == True:
        member_id = ''.join([choice(ascii_letters + digits) for i in range(8)]).upper()
        check_member_id_exists = ddb_client.get_item(
            TableName=memberships_table,
            Key={
                'id': {
                    'S': member_id
                }
            }
        )
        if 'Item' in check_member_id_exists.keys():
            logger.info(f"Duplicate member id {member_id} found, trying again to generate.")
            program_exists = True
        else:
            program_exists = False

    return member_id


def ddb_get_membership(membership_id, membership_table, programs_table):
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
        if 'Item' in ddb_response.keys():
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

            membership_result['program_info'] = ddb_get_program(membership['programid'], programs_table)

            result['statusCode'] = ddb_response['ResponseMetadata']['HTTPStatusCode']
            result['body'] = membership_result
        else:
            result['statusCode'] = 400
            result['body'] = "Membership not found"

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


def ddb_update_player_profile_status(players_table, data, player_id):
    """
    updates player status in dynamo db

    :params

    :data               : payload to update with
    :players_table      : the name of the ddb table
    """
    ddb_table = ddb_resource.Table(players_table)
    try:
        current_date_utc_int = get_current_datetime()

        expression_attribute_names = {
                '#modified': 'modified'
            }

        expression_attribute_values = {
                ':modified': str(current_date_utc_int)
            }

        update_expression = 'SET #modified = :modified'

        for k in data:
            expression_attribute_names[f"#{k}"] = k
            expression_attribute_values[f":{k}"] = data[k]
            if type(data[k]) == dict:
                update_expression+=f", #{k} = list_append(#{k} = :{k})"
            else:
                update_expression+=f", #{k} = :{k}"


        ddb_response = ddb_table.update_item(
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
        result = 'player status updated'
    except ClientError as e:
        logger.error(e)
        status_code = 400
        result = 'Something went wrong'

    return {
        'statusCode': status_code,
        'body': result
    }


def ddb_get_league_id(membership_id, memberships_table, leagues_table):
    """
    Takes a membership id and gets the league id

    :params
    :membership_id
    :memberships_table
    :leagues_table 

    """
    result = {}
    ddb_memberships_table = ddb_resource.Table(memberships_table)

    try:
        memberships_response = ddb_memberships_table.get_item(
            Key={
                'id': membership_id
            },
            ProjectionExpression='leagueid'
        )
        league_id = memberships_response['Item']['leagueid']

        result['statusCode'] = memberships_response['ResponseMetadata']['HTTPStatusCode']
        result['body'] = league_id
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(f"{error_code}: {error_msg}")
        result['statusCode'] = error_code
        result['body'] = "Something went wrong"

    return result