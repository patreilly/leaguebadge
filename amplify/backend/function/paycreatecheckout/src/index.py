import logging
import os
import json
import time
from datetime import datetime as dt, timezone
from decimal import Decimal
import boto3
import stripe
from botocore.exceptions import ClientError

ddb_client = boto3.client('dynamodb')
ddb_resource = boto3.resource('dynamodb')
ssm_client = boto3.client('ssm')
date_fields = ['modified','date_added'] # we never take these fields from a payload -

# set logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# env vars
MEMBERSHIPS_TABLE = os.environ['STORAGE_MEMBERSHIPS_NAME']
PROGRAMS_TABLE = os.environ['STORAGE_PROGRAMS_NAME']
LEAGUES_TABLE = os.environ['STORAGE_LEAGUES_NAME']
CHECKOUT_SESSIONS_TABLE = os.environ['STORAGE_STRIPECHECKOUTSESSIONS_NAME']
STRIPE_SECRET_KEY = ssm_client.get_parameter(Name='stripe-secret-key-test',WithDecryption=True)['Parameter']['Value']
# YOUR_DOMAIN = 'https://d1jagisbu7die2.cloudfront.net'
stripe.api_key = STRIPE_SECRET_KEY

DATE_FORMAT_DB = '%Y%m%d%H%M%S.%f'

def handler(event, context):
    logger.info('received event:')
    logger.info(event)
    origin = event['headers']['origin']
    checkout_data = json.loads(event['body'])
    player_id = event['requestContext']['identity']['cognitoAuthenticationProvider'].split(',')[1].split(':')[2]
    result = {}
    status_code = 200
    if event['httpMethod'] == 'POST':
        membership_id = checkout_data['id']
        selected_cards = checkout_data['selectedCards']

        # check if this is a renewal and if they're eligible to
        stripe_session = create_checkout_session(checkout_data, origin)
        if(stripe_session['statusCode'] == 200):
            # record checkout session id in ddb here along with player id and membership id
            record_cs_response = record_checkout_session(
                cs_id=stripe_session['id'],
                selected_cards=selected_cards,
                player_id=player_id,
                membership_id=membership_id,
                cs_table=CHECKOUT_SESSIONS_TABLE
            )
            if record_cs_response['statusCode'] == 200:
                result = stripe_session['id'] 
                status_code = record_cs_response['statusCode']
            else:
                result = record_cs_response['body']
                status_code = record_cs_response['statusCode']
        else:
            result = stripe_session['error']
            status_code = stripe_session['statusCode']
    else:
        result = 'Method Not Allowed'
        status_code=405
        logger.error(f"HTTP method {event['httpMethod']} not supported yet: {event}. Throwing 405 error")
  
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST'
        },
        'body': json.dumps(result)
    }


def create_checkout_session(checkout_data, domain):
    logger.info(f"Creating checkout session with data: {checkout_data}")
    result = {}
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[create_stipe_line_item(checkout_data)],
            mode='payment',
            success_url=f"{domain}/app/register/{checkout_data['id']}?success=true",
            cancel_url=f"{domain}/app/register/{checkout_data['id']}?cancelled=true",
        )
        logger.info(f"Checkout Session ID: {checkout_session.id}")
        result['id'] = checkout_session.id
        result['statusCode'] = 200
    except stripe.error.CardError as e:
        # https://stripe.com/docs/api/errors/handling?lang=python
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except stripe.error.RateLimitError as e:
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except stripe.error.InvalidRequestError as e:
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except stripe.error.AuthenticationError as e:
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except stripe.error.APIConnectionError as e:
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except stripe.error.StripeError as e:
        logger.error(e)
        result['error'] = e.user_message
        result['statusCode'] = e.code
    except Exception as e:
        logger.error(e)

    return result


def create_stipe_line_item(membership_object):
    logger.info(f"Creating line item with data: {membership_object}")
    line_item = {
            'price_data': {
                'currency': membership_object['priceCurrency'],
                'unit_amount': membership_object['priceAmount']*100,
                'product_data': {
                    'name': membership_object['name'],
                },
            },
            'quantity': 1,
            'description': f"{membership_object['league_info']['name']} {membership_object['program_info']['name']}"
            }
    if membership_object['full_league_logo_url'] and membership_object['full_league_logo_url'] != '':
        line_item['price_data']['product_data']['images'] = [membership_object['full_league_logo_url']]
    
    return line_item


def record_checkout_session(cs_id, selected_cards, player_id, membership_id, cs_table):
    """
    creates checkout session record 

    :params
    :cs_id          : checkout session id from stripe
    :player_id      : 
    :membership_id  : 
    :cs_table       : the name of the ddb table
    :selected_cards : cards to record for the member
    """
    try:
        logger.info(f"Recording stripe session id {cs_id}")
        ddb_table = ddb_resource.Table(cs_table)
        current_date_utc_int = get_current_datetime()
        item = {
            'cs_id': cs_id,
            'date_added': current_date_utc_int,
            'player_id': player_id,
            'membership_id': membership_id,
            'selected_cards': selected_cards
        }

        ddb_response = ddb_table.put_item(
            Item=item,
            ReturnValues='NONE'
        )
        status_code = ddb_response['ResponseMetadata']['HTTPStatusCode']
        result = f"Added checkout session {cs_id}"
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


def get_current_datetime():
    '''
    Returns current date time in UTC formatted as YYYYMMDDHHMMSSssssss
    '''
    current_date_utc = dt.now(timezone.utc)
    return Decimal(current_date_utc.strftime(DATE_FORMAT_DB))