import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
import moment from 'moment';
import {
  Form,
  Input,
  Tooltip,
  Select,
  message,
  Checkbox,
  Button,
  Collapse,
  Switch,
  DatePicker,
  InputNumber
} from 'antd';

import { QuestionCircleOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { APP_PREFIX_PATH } from 'configs/AppConfig'
import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';

const apiName = 'playercardsapi';
Amplify.configure(awsconfig);

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;
function collapseCallback(key) {
  // console.log(key);
}

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 4,
    },
  },
  wrapperCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 16,
    },
  },
};

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

const cardTypes = [
  {
    "label": "Web",
    "value": "web"
  },
  {
    "label": "Mobile Wallet",
    "value": "wallet"
  },
  {
    "label": "Email",
    "value": "email"
  },
  {
    "label": "PDF",
    "value": "pdf"
  },
  {
    "label": "Physical",
    "value": "physical"
  }
]

const RegistrationForm = (props) => {

  const [form] = Form.useForm();
  let history = useHistory();
  const urlParams = useParams();
  const [membershipState, setMembershipState] = React.useState();
  const [checkNotifyExpNumber, setNotifyExpNumber] = React.useState(false);
  const [checkNotifyExpBasis, setNotifyExpBasis] = React.useState(false);
  const [timeRangeState, setTimeRangeState] = React.useState({timeRange: 'duration'});
  const dateFormatList = ['MM/DD/YYYY', 'MM/DD/YY','YYYY-MM-DDTHH:mm:ss.000Z'];

  React.useEffect(() => {
    if(props.membership){
      setMembershipState(props.membership)
    }
    else if(urlParams.membershipid) {
      const membership_id = urlParams.membershipid;
      const path = `/admin/membership/${membership_id}`;
      const myInit = {
        headers: {},
        response: true,
      }
      API
      .get(apiName, path, myInit)
      .then((response) => {
        setMembershipState(response.data)
      })
    }
    else {
      console.log('No membership id not provided')
    }
    console.log(props)
  }, [])

  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo);

  };

	let initialValues = {
		...membershipState,
	}

  const inputMembershipChangeHandler = (event) => {    
    setMembershipState({...membershipState, ['leagueid']: event})
  }

  const inputTimeRangeChangeHandler = (event) => {    
    // setMembershipState({...membershipState, ['leagueid']: event})
    if(event === 'specificDate'){
      setTimeRangeState({timeRange: event})
    }
    else if (event === 'duration'){
      setTimeRangeState({timeRange: event})
    }
    else {
      console.log('Unknown event', event)
    }
  }

  const cleanFormData = (formValues) => {
    let result = {}
    for (const field of Object.keys(formValues)){
      // console.log(`${field} is moment?`, moment.isMoment(formValues[field]))
      if(moment.isMoment(formValues[field])){
        // console.log('new date format', formValues[field].format(dateFormatList[0]))
        result[field] = formValues[field].format(dateFormatList[0])
      }
      else {
        result[field] = formValues[field]
      }
    }
    return result
  }

  const onFormValuesChangeHandler = (changedValues, allValues) => {
    // console.log(changedValues, allValues)
    // setMembershipState({...membershipState, ...changedValues})
    setMembershipState(allValues)
  }

  const onFinish = values => {
    console.log('form values to be submitted', values)
    const cleanedData = cleanFormData(values)
    const key = 'updatable';
    message.loading({ content: 'Updating...', key });
    setTimeout(() => {
      try {

        const path = '/admin/membership/new';
        const myInit = {
          headers: {},
          response: true,
          body: cleanedData,
          // body: "{'name': 'GSSL'}",
          queryStringParameters: {id: props.profile.id}
        }
        API
        .post(apiName, path, myInit)
        .then(response => {
          console.log(response)
          props.getProfile(props.profile.id)
          message.success({ content: 'Done!', key, duration: 2 })
          history.push(`${APP_PREFIX_PATH}/admin/memberships`)
        })
        .catch(error => {
          console.log(error.response)
        })

      }
      catch(err) {
        console.log(err)
      }
      
      

      // message.success({ content: 'Done!', key, duration: 2 });
    }, 1000);

  };


  const program_info = props.profile.league_admin_info.map(league => {
    let program = league.programs.map(program => {
      let newObj = {}
      newObj['id'] = program.id
      // newObj['id'] = program.id
      newObj['name'] = program.name
      newObj['league'] = league.name
      return newObj
    })
    return program
  }).filter(program => program.length > 0).flat()
  return (
    <>
      <Form
        {...formItemLayout}
        form={form}
        initialValues={initialValues}
        name="editProgram"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        onValuesChange={onFormValuesChangeHandler}
        scrollToFirstError
      >
        <Collapse onChange={collapseCallback} defaultActiveKey={['1']}>
          <Panel header="Membership Information" key="1">
          <Form.Item
            name="programid"
            label="Program"
            rules={[
              {
                required: true,
                message: 'Please select a program for this membership.',
              },
            ]}
          >
            <Select >
              {
                program_info.map((program) => 
                <Option key={program.id} value={program.id}>{`${program.name} (${program.league})`}</Option>
                )
              }
            </Select> 
          </Form.Item>
            <Form.Item
              name="name"
              label="Membership Name"
              rules={[
                {
                  required: true,
                  message: 'Please enter the name of your membership',
                },
              ]}
            >
              <Input placeholder="Bronze Tier" />
            </Form.Item>
            <Form.Item
              name="membershipDesc"
              label={
                <span>
                  Description&nbsp;
                  <Tooltip title="Explain the value in this membership and who its intended for.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <TextArea 
                placeholder="test placeholder" 
                allowClear
                maxLength={100}
                showCount
                />
            </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Membership Settings" key="2">
            <Form.Item
              name="isPublic"
              label="Public"
              label={
                <span>
                  Public Membership&nbsp;
                  <Tooltip title="Allows the public to find your league and any public programs online.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                // onChange={updateLeagueIsPublic}
                defaultChecked={false}
                />
            </Form.Item>
            <Form.Item
              name="isActive"
              label="Active"
              label={
                <span>
                  Membership Active&nbsp;
                  <Tooltip title="Activates or inactivates all programs and memberships associated with your league">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                // onChange={updateLeagueIsActive}
                defaultChecked={false}
                />
            </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Pricing" key="3">
          <Form.Item
              label="Amount">
                <Form.Item
                name="priceAmount"
                >
                <InputNumber 
                      min={1} 
                      // defaultValue={3} 
                      // onChange={updateNotifyBeforeExpiryNumber}
                      />
                </Form.Item>

                <Form.Item
                name="priceCurrency"
                initialValue="USD"
                >
                  <Select style={{ width: 100 }} 
                    // onChange={inputTimeRangeChangeHandler}
                    >
                    <Option key='USD'>USD</Option>
                  </Select> 
                </Form.Item>
            </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Enrollment Settings" key="4">
            <p>Concurrent memberships by the same person are never allowed.</p>
            <Form.Item
              label={
                <span>
                  Time Period&nbsp;
                  <Tooltip title="The period of time this membership is valid for, starting from registration date/time.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Form.Item 
                name='timeRange'
                rules={[
                  {
                    required: true,
                    message: 'Please enter the time period for your membership duration',
                  },
                ]}
                >
                <Select style={{ width: 250 }} onChange={inputTimeRangeChangeHandler}
                  >
                  <Option key='specificDate'>Future Date</Option>
                  <Option key='duration'>Time Period After Registration</Option>
                </Select> 
              </Form.Item>
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Detail&nbsp;
                  <Tooltip title="The period of time this memberships is valid for, starting from registration date/time.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              // style={{ display: 'inline-block'  }}
            >
              {
                timeRangeState && timeRangeState.timeRange == 'specificDate' ?
                <Form.Item name="membershipEndDate">
                  <DatePicker  
                  format={dateFormatList[0]} 
                  style={{ width: 250 }}
                  />
                </Form.Item>
                :
                <>
                  <Form.Item
                    name="membershipDurationAmt"
                    >
                    <InputNumber 
                    min={1} 
                    max={40} 
                    
                    // onChange={updateNotifyBeforeExpiryNumber}
                    />
                  </Form.Item>
                  <Form.Item
                    name="membershipDurationBasis"
                    initialValue='days'
                    >
                    <Select style={{ width: 250 }} defaultActiveFirstOption >
                      <Option key='days'>Days</Option>
                      <Option key='weeks'>Weeks</Option>
                      <Option key='months'>Months</Option>
                      <Option key='years'>Years</Option>
                      <Option key='hours'>Hours</Option>
                    </Select>
                  </Form.Item>
                </>
              }

            </Form.Item>
            <p>Early renewals will always be effective at expiration of current membership.</p>
            <Form.Item
              label={
                <span>
                  Renewal Window&nbsp;
                  <Tooltip title="Time before expiration a person can renew their membership">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }>
                <Form.Item
                  name="renewalWindowAmt"
                  initialValue={30} 
                  >
                  <InputNumber 
                  min={1} 
                  max={40} 
                  />
                </Form.Item>
                <Form.Item
                  name="renewalWindowBasis"
                  initialValue='days'
                  >
                  <Select style={{ width: 250 }} >
                      <Option key='days'>Days</Option>
                      <Option key='weeks'>Weeks</Option>
                      <Option key='months'>Months</Option>
                      <Option key='years'>Years</Option>
                      <Option key='hours'>Hours</Option>
                    </Select>
                </Form.Item>

            </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Notification Settings" key="5">
            <p>These will serve as defaults for any membership in this program but are ultimately controlled by the member.</p>
            <Form.Item
              name="notifyAtExpiration"
              label={
                <span>
                  At Expiry&nbsp;
                  <Tooltip title="Notify members of their membership expiration on the expiration date/time">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                defaultChecked={false}
                />
            </Form.Item>
            <Form.Item
              name="notifyBeforeExpirationNumber"
              rules={[
                {
                  required: checkNotifyExpBasis,
                  message: 'Please enter the time period for your notifications',
                },
              ]}
              label={
                <span>
                  Before Expiry &nbsp;
                  <Tooltip title="The number of days or weeks or months before expiry to notify members.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              // valuePropName="checked"
            >
                  <InputNumber 
                  min={1} 
                  max={10} 
                  />
              </Form.Item>
            <Form.Item
              name="notifyBeforeExpirationBasis"
              label={"Time Period"}
              rules={[
                {
                  required: checkNotifyExpNumber,
                  message: 'Please enter the number of time periods before expiry',
                },
              ]}
            >
              <Select 
                style={{ width: 200 }} 
                >
                  <Option value=""></Option>
                  <Option value="hours">Hours before expiration</Option>
                  <Option value="days">Days before expiration</Option>
                  <Option value="weeks">Weeks before expiration</Option>
                  <Option value="months">Months before expiration</Option>
                  <Option value="years">Years before expiration</Option>
              </Select> 

          </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Player Identification" key="6">
            <p>Pick how you want people with this membership to identify themselves.</p>
            <Form.Item
              name="cardTypes"
              label={
                <span>
                  Card Types&nbsp;
                  <Tooltip title="The medium the card is presented in.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              valuePropName="checked"
            >
            <Checkbox.Group
                options={cardTypes}
              />
            </Form.Item>


          </Panel>
        </Collapse>
        <br/>
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">
            Register
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

const RegisterMembership = (props) => {
  return (
    <RegistrationForm {...props}/>
  )
}

const mapStateToProps = state => {
	const {profile} = state
	return {
		profile: profile
	}

}

const mapDispatchToProps = {
  getProfile
  }

export default connect(mapStateToProps, mapDispatchToProps)(RegisterMembership)
