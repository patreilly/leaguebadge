import React from 'react';
import {useHistory} from 'react-router-dom';
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
  DatePicker,
  Radio,
  Popover,
  InputNumber,
  notification,
  Upload
} from 'antd';

import { QuestionCircleOutlined} from '@ant-design/icons';
import { APP_PREFIX_PATH } from 'configs/AppConfig'
import Amplify, { API, Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';

const apiName = 'playercardsapi';
Amplify.configure(awsconfig);

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;
function collapseCallback(key) {
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

const profileFieldsList = [
  {
    "label": "First Name",
    "value": "firstName"
  },
  {
    "label": "Last Name",
    "value": "lastName"
  },
  {
    "label": "Phone",
    "value": "phoneNumber"
  },
  {
    "label": "Birthdate",
    "value": "dateOfBirth"
  },
  {
    "label": "Profile Picture",
    "value": "avatarUrl"
  },
  {
    "label": "City",
    "value": "city"
  },
  {
    "label": "State",
    "value": "state"
  },
  {
    "label": "Address",
    "value": "address1"
  },
  {
    "label": "Government ID",
    "value": "govIdUrl"
  }
]

const RegisterProgram = (props) => {
  const [form] = Form.useForm();
  let history = useHistory();

  const [newMemberApprovalState, setNewMemberApprovalState] = React.useState(false)
  const [renewalApprovalState, setRenewalApprovalState] = React.useState(false)
  const [agreementDocState, setAgreementDocState] = React.useState();
  const [leagueList, setLeagueList] = React.useState([]);
  // const [requiredFieldsList, setRequiredFieldsList] = React.useState();
  const dateFormatList = ['MM/DD/YYYY', 'MM/DD/YY','YYYY-MM-DDTHH:mm:ss.000Z'];

  let requiredFieldsList = []

  React.useEffect(() => {
    if (props.profile.league_admin_info){
      setLeagueList(props.profile.league_admin_info)
    }
  }, [props.profile.league_admin_info])
  
  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo);
  };

  const cleanFormData = (formValues) => {
    let result = {}
    for (const field of Object.keys(formValues)){
      if(moment.isMoment(formValues[field])){
        result[field] = formValues[field].format(dateFormatList[0])
      }
      else if (field == 'programAgreement'){
        console.log('leaving out programAgreement')
      }
      else if (field === 'requiredFields'){
        result[field] = convertRequiredFields(formValues.requiredFields)
      }
      else {
        result[field] = formValues[field]
      }
    }
    return result
  }

  const convertRequiredFields = (data, toUiFields=false) => {
    let requiredFieldsArray = [];
    if(toUiFields){
      // convert db fields to UI fields
      for (let field = 0; field < data.length; field++) {
        const element = data[field];
        if (['birthDay','birthMonth','birthYear'].includes(element)){
          // check if already added birthDate
          if(!requiredFieldsArray.includes('dateOfBirth')){
            requiredFieldsArray = [...requiredFieldsArray, 'dateOfBirth']
          }
        }
        else {
          requiredFieldsArray = [...requiredFieldsArray, element]
        }
      }
    }
    else {
      // convert UI fields to db fields
      console.log('required fields to transform', data)
      for (let field = 0; field < data.length; field++) {
        const element = data[field];
        if (element == 'dateOfBirth'){
          requiredFieldsArray = [
            ...requiredFieldsArray, 
            'birthDay',
            'birthMonth',
            'birthYear'
          ]
        }
        else {
          requiredFieldsArray = [...requiredFieldsArray, element]
        }
      }
    }
    return requiredFieldsArray;
  }

  const handleNewMemberApprovalChange = (event) => {
    const approvalMethods = ['temporary','manual'];
    if(approvalMethods.includes(event.target.value)){
      setNewMemberApprovalState(true)
    }
    else {
      setNewMemberApprovalState(false)
    }
  }

  const handleRenewalApprovalChange = (event) => {
    const approvalMethods = ['temporary','manual'];
    if(approvalMethods.includes(event.target.value)){
      setRenewalApprovalState(true)
    }
    else {
      setRenewalApprovalState(false)
    }
  }

  const handleRequiredFieldsEvent = (event) => {
    if(event.target.checked){
      if(event.target.value === 'governmentId'){
        openWarnGovernmentId('info')
      }
      if(event.target.value === 'dateOfBirth'){
        requiredFieldsList.push('birthMonth')
        requiredFieldsList.push('birthDay')
        requiredFieldsList.push('birthYear')

      }
      else {
        requiredFieldsList.push(event.target.value)
      }
    }
    else {
      if(event.target.value === 'dateOfBirth'){
        requiredFieldsList.splice(requiredFieldsList.indexOf('birthMonth'), 1)
        requiredFieldsList.splice(requiredFieldsList.indexOf('birthDay'), 1)
        requiredFieldsList.splice(requiredFieldsList.indexOf('birthYear'), 1)
      }
      else{
        requiredFieldsList.splice(event.target.value, 1)
      }
    }
    // console.log(requiredFieldsList)
  }

  const openWarnGovernmentId = type => {
    notification[type]({
      duration: 7,
      message: 'Requiring Government IDs',
      description:
      "You've chosen government id as a required field. You will have up to 10 days to use this data after player registration for your approval process until it will no longer be accessible.",
    });
  };

  const onFinish = values => {
    const key = 'updatable';
    const cleanedData = cleanFormData(values)
    message.loading({ content: 'Updating...', key });
    setTimeout(() => {
      try {

        const path = '/admin/program/new';
        const myInit = {
          headers: {},
          response: true,
          body: cleanedData,
          queryStringParameters: {id: props.profile.id}
        }
        API
        .post(apiName, path, myInit)
        .then(response => {

          if(agreementDocState){
            amplifyUploadAgreement(
              {
                ...agreementDocState,
                leagueid: cleanedData.leagueid,
                programid: response.data.programId
              })
              .then(response => {
                props.getProfile(props.profile.id)
                message.success({ content: 'Done!', key, duration: 2 })
                history.push(`${APP_PREFIX_PATH}/admin/programs`)
              })
          }
          else {
            props.getProfile(props.profile.id)
            message.success({ content: 'Done!', key, duration: 2 })
            history.push(`${APP_PREFIX_PATH}/admin/programs`)
          }

        })
        .catch(error => {
          console.log(error.response)
        })
      }
      catch(err) {
        console.log(err)
      }
    }, 1000);

  };

  const amplifyUploadAgreement = async options => {
    console.log(options);
    const { fileData, contentType, fileName, leagueid, programid } = options;
    try {

      const newFileName = `agreements/${leagueid}/${programid}/${Date.now()}.${fileName.split('.')[1]}`
      await Storage.put(
        newFileName,
        fileData, {
        level: 'public',
        contentType: contentType
      })
      .then(response => {
        // console.log(response)
        delete agreementDocState.fileData // don't want to upload to dynamo
        delete agreementDocState.fileName // don't want to upload to dynamo
        setAgreementDocState({
          agreement : {
            ...agreementDocState,
            s3Key: response.key
          }
        })

        const path = `/admin/program/${programid}`;
        const myInit = {
          headers: {},
          response: true,
          body: agreementDocState,
        }
        API
        .put(apiName, path, myInit)
        .then(
          // message.success({ content: 'Done!', key, duration: 2 })
        )
      })
      .catch(error => {
        console.log(error)
      })
      // console.log(result);
      // onSuccess(result);
      
    }
    catch (err) {
      console.error(err);
      // onError({ err });
    }
  }

  const dummyRequest = ({ file, onSuccess }) => {
    setTimeout(() => {
      onSuccess("ok");
    }, 0);
  };

  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  }

  const onUploadAgreement = info => {
    // console.log(info);
    const key = 'updatable';
    // console.log(info.target)
    if (info.file.status === 'uploading') {
      message.loading({ content: 'Uploading...', key, duration: 1000 });
      // console.log(info.file, info.fileList);
      return;
    }
    if (info.file.status === 'done') {
      console.log(info.file.originFileObj)
			getBase64(info.file.originFileObj, imgUrl => {
        // setLogoDisplayState({displayLogo: imgUrl})
			})
      
      setAgreementDocState({
          contentType: info.file.type,
          fileName: info.file.name,
          fileData: info.file.originFileObj
      })

      message.success({ content: `Uploaded! ${info.file.name}`, key, duration: 1.5 });
      return;
    }
  };

  const onRemoveAgreement = () => {
    setAgreementDocState()
  }

  
  return (
    <>
      <Form
        {...formItemLayout}
        form={form}
        name="createProgram"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        scrollToFirstError
      >
        <Collapse onChange={collapseCallback} defaultActiveKey={['1']}>
          <Panel header="Program Information" key="1">
          <Form.Item
            name="leagueid"
            label="League"
            rules={[
              {
                required: true,
                message: 'Please select a league for this program.',
              },
            ]}
          >
            <Select style={{ width: 250 }} >
              {
                // props.profile.league_admin_info ?
                leagueList.map((league) => 
                <Option key={league.id} value={league.id}>{league.name}</Option>
                )
                // :
                // null
              }
            </Select> 
          </Form.Item>
            <Form.Item
              name="name"
              label="Program Name"
              rules={[
                {
                  required: true,
                  message: 'Please enter the name of your program',
                },
              ]}
            >
              <Input placeholder="Annual Player Pass" />
            </Form.Item>
            <Form.Item
										name="programEffectiveDate"
                    // initialValue={moment()}
                    label={
                      <span>
                        Effective Date&nbsp;
                        <Tooltip title="The earliest date a membership to this program can be effective.">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: 'Your program must have an effective date',
                      },
                    ]}
									>
										<DatePicker  
											format={dateFormatList[0]} 
											className="w-100"
											
											/>
							</Form.Item>
              <Form.Item
										name="programEndDate"
                    label={
                      <span>
                        End Date&nbsp;
                        <Tooltip title="The last date any given membership would be valid. No end date means forever.">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </span>
                    }
									>
										<DatePicker  
											format={dateFormatList[0]} 
											className="w-100"
											/>
							</Form.Item>
            <Form.Item
              name="programDesc"
              label={
                <span>
                  Description&nbsp;
                  <Tooltip title="Tell people any details about this program that would be important to them.">
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
          <Panel header="Contact information" key="2">
            <Form.Item
              name="contactName"
              label="Contact Name"

              label={
                <span>
                  Contact Name&nbsp;
                  <Tooltip title="Who should people reach out to for program details?">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Input placeholder="Greg Berhalter" />
            </Form.Item>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[
                {
                  type: 'email',
                  message: 'The input is not valid E-mail!',
                },
                {
                  required: false,
                  message: 'Please input your E-mail!',
                },
              ]}
            >
              <Input placeholder="joe@test.com" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[
                {
                  required: false,
                  message: 'Please input your phone number!',
                },
              ]}
            >
              <Input
                style={{
                  width: '100%',
                }}
              />
            </Form.Item>
          </Panel>
        </Collapse>
        <br/>
        <Collapse onChange={collapseCallback} collapsible="header">
          <Panel header="Enrollment Settings" key="3">
            <Form.Item
              name="isPublic"
              initialValue={0}
              label={
                <span>
                  Public&nbsp;
                  <Tooltip title="Allows the public to find your league and any public programs online.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Radio.Group >
                <Radio value={1}>Public</Radio>
                <Radio value={0}>Private</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="isActive"
              initialValue={0}
              label={
                <span>
                  Active&nbsp;
                  <Tooltip title="If your program is active, people can join it.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Radio.Group >
                <Radio value={1}>Active</Radio>
                <Radio value={0}>Inactive</Radio>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item
              name="approvalMethodNewMembers"
              initialValue={'automatic'}
              onChange={handleNewMemberApprovalChange}
              label={
                <span>
                  New Member<br/>
                  Approval Method&nbsp;
                  <Tooltip title="Your approval process for new members">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Radio.Group buttonStyle="solid">
                <Popover content={"Members will immediately recieve their identification if the required fields are entered"}><Radio.Button value="automatic">Automatic</Radio.Button></Popover>
                <Popover content={"Members won't receive any valid identification until you approve them."} ><Radio.Button value="manual">Manual</Radio.Button></Popover>
                <Popover content={"Members will receive a temp pass valid until your days to approve, otherwise they will be rejected."}><Radio.Button value="temporary">Temporary</Radio.Button></Popover>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="approvalDaysNewMembers"
              hidden={!newMemberApprovalState}
              rules={[
                {
                  required: newMemberApprovalState,
                  message: 'please enter a number of days up to 10',
                },
              ]}
              label={
                <span>
                  Days to Approve<br/>
                  New Members&nbsp;
                  <Tooltip title="You will have this many days to approve of new members before they're rejected">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber max={10}/>
            </Form.Item>

            <Form.Item
              name="approvalMethodRenewals"
              initialValue={'automatic'}
              onChange={handleRenewalApprovalChange}
              label={
                <span>
                  Renewal<br/>
                  Approval Method&nbsp;
                  <Tooltip title="Your approval process for members renewing their memberships">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Radio.Group buttonStyle="solid">
                <Popover content={"Members will immediately recieve their identification if the required fields are entered"}><Radio.Button value="automatic">Automatic</Radio.Button></Popover>
                <Popover content={"Members won't receive any valid identification until you approve them."} ><Radio.Button value="manual">Manual</Radio.Button></Popover>
                <Popover content={"Members will receive a temp pass valid until your days to approve, otherwise they will be rejected."}><Radio.Button value="temporary">Temporary</Radio.Button></Popover>
              </Radio.Group>
            </Form.Item>
            
            
            <Form.Item
              name="approvalDaysRenewals"
              hidden={!renewalApprovalState}
              rules={[
                {
                  required: renewalApprovalState,
                  message: 'please enter a number of days up to 10',
                },
              ]}
              label={
                <span>
                  Days to Approve<br/>
                  Renewals&nbsp;
                  <Tooltip title="You will have this many days to approve of renewals before they're rejected">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber max={10}/>
            </Form.Item>



            
            <Form.Item
              name="cognitoFormId"
              label={
                <span>
                  Cognito Form ID&nbsp;
                  <Tooltip title="The cognito form id to use as your program registration form">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Input placeholder="66" />
            </Form.Item>
            <Form.Item
              name="requiredFields"
              onChange={handleRequiredFieldsEvent}
              label={
                <span>
                  Required Fields&nbsp;
                  <Tooltip title="Required information members need to complete before joining. People will not be able to join this program without first completing these fields in their profile.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }>
            <Checkbox.Group
                options={profileFieldsList}
              />
            </Form.Item>
            <Form.Item
              name="programAgreement"
              label={
                <span>
                  Program Agreement&nbsp;
                  <Tooltip title="Your legal agreement players must agree to before joining this program.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }>
              <Upload 
                onChange={onUploadAgreement}
                onRemove={onRemoveAgreement}
                showUploadList={true} 
                customRequest={dummyRequest} 
                accept={"application/pdf"}
                >
                  <Button type="default">Upload Agreement (PDF)</Button>
              </Upload>
            </Form.Item>
          
          
          </Panel>
        </Collapse>
        <br/>
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">
            Register Program
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

const mapStateToProps = state => {
	const {profile} = state
	return {
		profile: profile
	}
}

const mapDispatchToProps = {
  getProfile
  }

export default connect(mapStateToProps, mapDispatchToProps)(RegisterProgram)
