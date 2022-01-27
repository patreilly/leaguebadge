import React from 'react';
import {useHistory} from 'react-router-dom';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
// import { APP_PREFIX_PATH } from 'configs/AppConfig'
import Amplify, { Storage } from 'aws-amplify';
import awsconfig from '../../../aws-exports';
import AllPagesPDFViewer from './all-pages'
// import { Elements } from "@stripe/react-stripe-js";
import moment from 'moment';
// import Checkout from './Checkout'
import CheckoutManaged from './CheckoutManaged'

import {
  Form,
  Checkbox,
  Button,
  message,
  List,
  Divider,
  Row,
  Col
} from 'antd';
import { select } from '@redux-saga/core/effects';

Amplify.configure(awsconfig);
const apiName = 'playercardsapi';

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
  },
};

// const getStripeSession = async (event) => {
//   const stripe = await stripePromise;

//   const response = await fetch("/create-checkout-session", {
//     method: "POST",
//   });

//   const session = await response.json();

//   // When the customer clicks on the button, redirect them to Checkout.
//   const result = await stripe.redirectToCheckout({
//     sessionId: session.id,
//   });

//   if (result.error) {
//     // If `redirectToCheckout` fails due to a browser or network
//     // error, display the localized error message to your customer
//     // using `result.error.message`.
//     console.log(result.error)
//   }
// };

const Message = ({ message }) => (
  <section>
    <p>{message}</p>
  </section>
);

const virtualCardTypes = ['web','pdf','wallet','email']


const RegisterMember = (props) => {
  // console.log('props received in register member', props)
  const [form] = Form.useForm();
  const [cognitoFormsState, setCognitoFormsState] = React.useState(false);
  const [displayAgreementState, setDisplayAgreementState] = React.useState(null)
  const [checkoutEnbledState, setCheckoutEnabledState] = React.useState(false)
  const [membershipState, setMembershipState] = React.useState()
  const [membershipDetails, setMembershipDetails] = React.useState([]);
  const [currentMemberships, setCurrentMemberships] = React.useState([]);
  const [cardTypes, setCardTypes] = React.useState([])
  const [virtualCardSelected, setVirtualCardSelected] = React.useState(false)
  const [physicalCardSelected, setPhysicalCardSelected] = React.useState(false)
  const [agreementSigned, setAgreementSigned] = React.useState(false)
  const [concurrentPhysicalCardAllowed, setConcurrentPhysicalCardAllowed] = React.useState(false)
  const [selectedCardTypes, setSelectedCardTypes] = React.useState([])
  const [isRenewal, setIsRenewal] = React.useState(false)

  const history = useHistory();

  const calculateEffectiveDateTime = (programInfo) => {
    let programEffectiveDate = moment(programInfo.programEffectiveDate);
    let todayDateTime = moment();
    let membershipEffectiveDateTime;
    if(programEffectiveDate.isAfter(todayDateTime)){
      membershipEffectiveDateTime = programEffectiveDate
    }
    else{
      membershipEffectiveDateTime = todayDateTime
    }

    return membershipEffectiveDateTime
  }

  const calculateMembershipExpirationDateTime = (membershipDetails, startDate) => {
    let membershipExpirationDateTime;
    if(membershipDetails.program_info.programEndDate){
      console.log('program end date found')
      membershipExpirationDateTime = moment(membershipDetails.program_info.programEndDate);
    }
    else {
      let membershipDurationAmt = membershipDetails.membershipDurationAmt;
      let membershipDurationBasis = membershipDetails.membershipDurationBasis;
      let duration = moment.duration(membershipDurationAmt, membershipDurationBasis);
      membershipExpirationDateTime = startDate.clone();
      membershipExpirationDateTime.add(duration)
    }

    return membershipExpirationDateTime
    
  }

  React.useEffect(() => {
    setMembershipState(history.location.state)

  }, [history.location])

  React.useEffect(() => {
    console.log('selected Card Types', selectedCardTypes)
    if(agreementSigned && selectedCardTypes.length > 0){
      setCheckoutEnabledState(true)
    }
    else {
      setCheckoutEnabledState(false)
    }
  }, [selectedCardTypes])

  React.useEffect(() => {
    if(agreementSigned && selectedCardTypes.length > 0){
      setCheckoutEnabledState(true)
    }
    else {
      setCheckoutEnabledState(false)
    }
  }, [agreementSigned])


  React.useEffect(() => {
		if(props.profile.memberships){
			let membershipArray = []
			for (var i=0;i<props.profile.memberships.length;i++){
				// console.log('membership id', props.profile.memberships[i].id)
				membershipArray.push(props.profile.memberships[i].membershipid)
			}
			setCurrentMemberships(membershipArray)

		}
  },[props.profile])


  const getProgramAgreement = s3Key => {
    console.log('getting agreement', s3Key)
    try {
      Storage.get(
        s3Key,
        {
          level: 'public',
          download: true
        }
      )
      .then(response => {
        getBase64(response.Body, data =>
          setDisplayAgreementState(data)
        )
      })
    }
    catch (err) {
      console.log(err)
    }
	}

  React.useEffect(() => {
    // console.log('membershipState', membershipState)
    if(membershipState && membershipState.hasOwnProperty('program_info')){
      if(membershipState.hasOwnProperty('program_info')){
        let effectiveDateTime = calculateEffectiveDateTime(membershipState.program_info)
        let expirationDateTime = calculateMembershipExpirationDateTime(membershipState, effectiveDateTime)
  
        setMembershipDetails([
          // ...membershipDetails,
          `Effective Date: ${effectiveDateTime.format('dddd, MMMM Do YYYY, h:00 a')}`,
          `Expiration Date: ${expirationDateTime.format('dddd, MMMM Do YYYY, h:00 a')}`,
          `Price: ${membershipState.priceAmount} ${membershipState.priceCurrency}`,
          `Card Types Available: ${membershipState.cardTypes.join(', ')}`
        ])
        if(membershipState.program_info.programAgreement){
          getProgramAgreement(membershipState.program_info.programAgreement)
        }
      }
      if(membershipState.hasOwnProperty('cardTypes')){
        setCardTypes(membershipState.cardTypes)
      }

      // set isRenew state
			for (var i=0;i<currentMemberships.length;i++){
				if(currentMemberships[i].membershipid == membershipState.id){
					const player_membership = currentMemberships[i]
					const expirationDate = moment(player_membership.expiration_date)
					const earliestRenewalDateTime = expirationDate.subtract(membershipState.renewalWindowAmt, membershipState.renewalWindowBasis)
					// console.log('earliestRenewalDateTime', earliestRenewalDateTime.format('MM/DD/YYYY hh:mm a'))
					if(moment() > earliestRenewalDateTime){
            setIsRenewal(true)
					}
				}
			}
    }

  }, [membershipState])

  const canRenew = (membership) => {
		let enabled = false
		if(props.profile.memberships){
			for (var i=0;i<props.profile.memberships.length;i++){
				if(props.profile.memberships[i].membershipid == membership.id){
					const player_membership = props.profile.memberships[i]
					const expirationDate = moment(player_membership.expiration_date)
					const earliestRenewalDateTime = expirationDate.subtract(membership.renewalWindowAmt, membership.renewalWindowBasis)
					// console.log('earliestRenewalDateTime', earliestRenewalDateTime.format('MM/DD/YYYY hh:mm a'))
					if(moment() > earliestRenewalDateTime){
						enabled = true
					}
				}
			}
		}

		return enabled
	}

  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  }

  const handleAgreementOnChange = (event) => {
    setAgreementSigned(event.target.checked)
  }

  const containsAny = (array, searchArray) => {
    // console.log('search array', searchArray)
    let found = false
    for (let index = 0; index < array.length; index++) {
      if(searchArray.includes(array[index])){
        found = true
        break;
      }
    }

    return found
  }


  const handleCardCheckboxChange = (event) => {
    const cardType = event.target.value
    const checked = event.target.checked
    const isVirtualCard = virtualCardTypes.includes(cardType)
    let selectedCardTypesLocal = selectedCardTypes

    if(checked){
      selectedCardTypesLocal.push(cardType)
      if(isVirtualCard){
        setVirtualCardSelected(true)
      }
      else {
        setPhysicalCardSelected(true)
      }
    }
    else {
      const cardTypeIndex = selectedCardTypesLocal.indexOf(cardType)
      // console.log('selected card types before splice', selectedCardTypesLocal)
      // console.log('index to splice', cardTypeIndex)
      selectedCardTypesLocal.splice(cardTypeIndex, 1)
      // any other virtual cards left?
      // console.log('array after splice', selectedCardTypesLocal)
      if(isVirtualCard ){
        if(!containsAny(selectedCardTypesLocal, virtualCardTypes)){
          setVirtualCardSelected(false)
        }
      }
      else {
        setPhysicalCardSelected(false)
      }
    }
    console.log('setting selected card types')
    setSelectedCardTypes(selectedCardTypesLocal)
  }



  return (
    <>
      <h2>{membershipState ? membershipState.program_info.name : ''}</h2>
      <h3>{membershipState ? membershipState.name  : ''}</h3>
      <div>
        <List
          size="small"
          header={<div>Membership Details:</div>}
          // footer={<div>Footer</div>}
          bordered
          dataSource={membershipDetails}
          renderItem={item => <List.Item>{item}</List.Item>}
        />
      </div>
      <div>
      <Divider orientation="left">Membership ID Options</Divider>

        <Form
          form={form}
          // onFinish={onFinish}
          // onFinishFailed={onFinishFailed}
          scrollToFirstError
          >
            <Form.Item>
              <Checkbox.Group style={{ width: '100%' }}>
                <Row>
                  {
                    cardTypes.map(cardType => 
                      cardType != 'physical' ?
                      <Col span={8}>
                        {
                        <Checkbox
                        value={cardType}
                        style={{
                          textTransform: 'capitalize',
                          marginBottom: '5px'
                        }}
                        onChange={handleCardCheckboxChange}
                        disabled={physicalCardSelected}
                        >
                          {cardType}
                        </Checkbox>
                        }
                      </Col>
                      :
                      null
                    )
                  }
                  {
                    cardTypes.includes('physical') ?
                    <Col span={8}>
                      {
                      <Checkbox
                      value={'physical'}
                      style={{
                        textTransform: 'capitalize',
                        marginBottom: '5px'
                      }}
                      onChange={handleCardCheckboxChange}
                      disabled={virtualCardSelected}
                      >
                        {'Physical'}
                      </Checkbox>
                      }
                    </Col>
                    :
                    null
                  }
                </Row>
              </Checkbox.Group>
            </Form.Item>

        <Divider orientation="left">Agreement</Divider>

        <AllPagesPDFViewer pdf={displayAgreementState} />

        <br/>


          <Form.Item
            name="agreement"
            
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error('Please accept the league agreement before submitting payment')),
              },
            ]}
            // {...tailFormItemLayout}
          >
            <Checkbox onChange={handleAgreementOnChange}>
              I have read the <a href="">agreement</a>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <CheckoutManaged checkoutEnabled={checkoutEnbledState} membership={membershipState} selectedCardTypes={selectedCardTypes}/>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

const mapStateToProps = state => {
  // console.log(state)
	const {profile} = state
	return {
		profile: profile
	}

}

const mapDispatchToProps = {
  getProfile
  }

export default connect(mapStateToProps, mapDispatchToProps)(RegisterMember)
