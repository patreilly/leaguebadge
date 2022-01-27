import React, { Component, useState } from 'react';
import {Redirect, useHistory, useParams} from 'react-router-dom';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import store from '../../../../redux/store';
import {
  Avatar,
  Form,
  Input,
  Tooltip,
  Select,
  message,
  Checkbox,
  Button,
  Collapse,
  Radio,
  Upload
} from 'antd';

import { QuestionCircleOutlined, PictureOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import Flex from 'components/shared-components/Flex';
import { APP_PREFIX_PATH, CLOUDFRONT_URL } from 'configs/AppConfig'
import Amplify, { API, Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
const apiName = 'playercardsapi';
Amplify.configure(awsconfig);

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;
function collapseCallback(key) {
  // console.log(key);
}

const defaultLogo = 'https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png'

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

const RegisterLeague = (props) => {
  const [leagueState, setLeagueState] = React.useState();
  const [initialValues, setInitialValues] = React.useState({})
  const [logoState, setLogoState] = React.useState();
  const [logoDisplayState, setLogoDisplayState] = React.useState({displayLogo: ''});
  // const [logoDisplayState, setLogoDisplayState] = React.useState(leagueState.logo_url);
  const s3StorageLevel = 'public';
  const dateFormatList = ['MM/DD/YYYY', 'MM/DD/YY','YYYY-MM-DDTHH:mm:ss.000Z'];

  const getLeagueIndex = (leagueArray, leagueid) => {
    let index = leagueArray.findIndex(league => league.id === leagueid)
    return index
  }

	const urlParams = useParams();
  const leagueId = urlParams.leagueid;

  React.useEffect(() => {
    if(props.profile.league_admin_info){
      let leagueIndex = getLeagueIndex(
        props.profile.league_admin_info, 
        urlParams.leagueid
        )
      setLeagueState(props.profile.league_admin_info[leagueIndex])
      setInitialValues(props.profile.league_admin_info[leagueIndex])
    }
  }, [props.profile])

  React.useEffect(() => {
		if(!logoDisplayState){
			setLogoDisplayState({displayLogo: ''})
		}
  }, [logoDisplayState])

  React.useEffect(() => {
    form.resetFields()
  }, [initialValues])

  React.useEffect(() => {
    if(leagueState && leagueState.logo_url){
      setLogoDisplayState(`${CLOUDFRONT_URL}${leagueState.logo_url}`)
    }
  }, [leagueState])

  const cleanState = (leagueData) => {
    // console.log('state before cleaning it', leagueData)
    // removes attributes we don't update here
    // before PUT
    delete leagueData.memberships
    delete leagueData.modified
    delete leagueData.date_added
    delete leagueData.id
    delete leagueData.programs
    // console.log('state after cleaning it', leagueData)
    return leagueData;
  }


  // const leagueData = cleanState(props.profile.league_admin_info[leagueIndex])

  // console.log('after delete memberships', leagueData)

  const [form] = Form.useForm();
  let history = useHistory();



  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
  }

  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo);

  };


  const onUploadLogo = info => {
    // console.log(info);
    const key = 'updatable';
		// const { contentType, fileName, IdImage, s3FileName } = govIdState;
		const fileNameGuid = uuidv4();
		const contentType = info.file.type
		const fileExtension = info.file.type.split('/')[1]
		const IdImage = info.file.originFileObj
		const s3FileName = `logos/${fileNameGuid}.${fileExtension}`

		if (info.file.status === 'uploading') {
			message.loading({ content: 'Uploading...', key, duration: 1000 });
			// console.log(info.file, info.fileList);
			
			return;
		}
		if (info.file.status === 'done') {
			try {
				// include delete of old logo here
				Storage.put(
					s3FileName, 
					IdImage, 
					{
						level: s3StorageLevel,
						contentType: contentType
					})
				.then(response => {
					console.log('logo s3 key', response.key)
					message.success({ content: `Uploaded! ${info.file.name}`, key,  duration: 3 })
          setLogoState(response.key)
          setLogoDisplayState(`${CLOUDFRONT_URL}${response.key}`)
					
				})
				.catch(error => {
					message.error({ content: `Something went wrong: ${error}`, key, duration: 3 })
				  })
			}
			catch (err) {
				// console.error(err);
				message.error({ content: `Something went wrong: ${err}`, key, duration: 3 })
			}
			
			return;
		}
  };

  const onRemoveLogo = () => {
    setLogoState()
    setLogoDisplayState({displayLogo: ''})
  }

  const cleanFormData = (formValues) => {
    let result = {}
    for (const field of Object.keys(formValues)){
      if(moment.isMoment(formValues[field])){
        result[field] = formValues[field].format(dateFormatList[0])
      }
      else {
        result[field] = formValues[field]
      }
    }
    return result
  }


  const updateLeague = (leagueId, data) => {
    const key = 'updatable';
    message.loading({ content: 'Updating...', key });
    setTimeout(() => {
      try {
        console.log('PUT path', `/admin/league/${leagueId}`)
        const path = `/admin/league/${leagueId}`;
        const myInit = {
          headers: {},
          response: true,
          body: data,
          queryStringParameters: {id: props.profile.id}
        }
        API
        .put(apiName, path, myInit)
        .then(response => {
          // console.log(response)
          // console.log('getting profile')
          props.getProfile(props.profile.id)
          message.success({ content: 'Done!', key, duration: 3 })
          history.push(`${APP_PREFIX_PATH}/admin/leagues`)
        })
        .catch(error => {
          console.log(error.response)
        })

      }
      catch(err) {
        console.log(err)
      }
    }, 1000);
  }

  const onFinish = values => {
    const cleanedData = cleanFormData(values)
    if(logoState){
      cleanedData.logo_url = logoState
    }
    updateLeague(leagueId, cleanedData)

  };


  const dummyRequest = ({ file, onSuccess }) => {
    setTimeout(() => {
      onSuccess("ok");
    }, 0);
  };

  return (
    <>
      <Flex alignItems="center" mobileFlex={true} className="text-center text-md-left">
        
        <Avatar 
        size={90}
        src={logoDisplayState ? logoDisplayState : ''} 
        icon={<PictureOutlined />}/>

        <div className="ml-3 mt-md-0 mt-3">
          {/* <Upload onChange={onUploadAavater} showUploadList={false} action={avatarEndpoint}> */}
          <Upload onChange={onUploadLogo} showUploadList={false} customRequest={dummyRequest} accept={"image/png, image/jpeg, image/jpg"}>
            <Button type="primary">Upload Logo</Button>
          </Upload>
          {/* <Button type="primary" onClick={onUploadAavater}>Change Avatar</Button> */}
          <Button className="ml-2" onClick={onRemoveLogo}>Remove</Button>
        </div>
      </Flex>
      <br/>
      <br/>
      <Form
        {...formItemLayout}
        form={form}
        name="registerLeague"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={initialValues}
        scrollToFirstError
      >
        <Collapse onChange={collapseCallback} defaultActiveKey={['1']}>
          <Panel header="League Information" key="1">
            <Form.Item
              name="name"
              label="League Name"
              rules={[
                {
                  required: true,
                  message: 'Please enter the name of your league',
                },
              ]}
            >
              <Input placeholder="ABC Sports League" />
            </Form.Item>
            <Form.Item
              name="nickname"
              label={
                <span>
                  Nickname&nbsp;
                  <Tooltip title="What are some alternate names your league is known as? Seperate with commas.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Input placeholder="ABC Sports, ABC" />
            </Form.Item>
            <Form.Item
              name="leagueType"
              label={
                <span>
                  League Type&nbsp;
                  <Tooltip title="What type of activity is your league associated with?">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Input placeholder="Soccer, Football, Bowling, etc."/>
            </Form.Item>
            <Form.Item
              name="leagueDesc"
              label={
                <span>
                  League Description&nbsp;
                  <Tooltip title="What do you want people to know about your league?">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <TextArea 
                placeholder="Founded in 1976, the ABC Sports league...." 
                allowClear
                maxLength={1000}
                showCount
                
                />
            </Form.Item>
            <Form.Item
              name="website"
              label="Website"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="address1"
              label="Address 1"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="address2"
              label="Address 2"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="city"
              label="City"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="state"
              label="State"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="postCode"
              label="Zip"
            >
              <Input />
            </Form.Item>


          </Panel>
        </Collapse>
        <Collapse onChange={collapseCallback}>
          <Panel header="Contact information" key="2">
            <Form.Item
              name="contactName"
              label="Contact Name"

              label={
                <span>
                  Contact Name&nbsp;
                  <Tooltip title="Who should people reach out to for account details?">
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
                // addonBefore={prefixSelector}

                style={{
                  width: '100%',
                }}
              />
            </Form.Item>
          </Panel>
        </Collapse>
        <Collapse onChange={collapseCallback}>
          <Panel header="League Settings" key="3">
            <Form.Item
              name="isPublic"
              initialValue={0}
              label={
                <span>
                  Public League&nbsp;
                  <Tooltip title="Allows people to find your league and any public programs online.">
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
                  League Active&nbsp;
                  <Tooltip title="If your league is active, people can join it.">
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
          </Panel>
        </Collapse>
        <Form.Item 
          name="agreement" 
          valuePropName="checked" 
          {...tailFormItemLayout}
          rules={[
            {
              required: true,
              message: 'Please read the agreement before registering your league.',
            },
          ]}
          >
          <Checkbox 
            // onChange={updateReadAgreement}
            defaultChecked={false}
            >
            I have read the <a href="/#">agreement</a>
          </Checkbox>
        </Form.Item>
        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">
            Update League
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

export default connect(mapStateToProps, mapDispatchToProps)(RegisterLeague)
