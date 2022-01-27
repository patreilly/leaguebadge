import React, { useEffect, setState } from 'react';
import { Provider, connect } from 'react-redux';
import store from '../../../../redux/store';
import { updateProfile, getProfile } from 'redux/actions/Profile';
import { CLOUDFRONT_URL } from 'configs/AppConfig'
import { Form, Avatar, Checkbox, Button, Input, DatePicker, Row, Col, message, Upload, Select, Tooltip, Tag, Modal } from 'antd';

import { UserOutlined, CheckCircleOutlined, ClockCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { ROW_GUTTER } from 'constants/ThemeConstant';
import Flex from 'components/shared-components/Flex'
import moment from 'moment';
import {COUNTRIES} from './countries';
import { v4 as uuidv4 } from 'uuid';

import Amplify, { Auth, API, Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const { Option } = Select;
const {CheckableTag} = Tag;

const birthMonths = [ 
    {label: 'January', value: 1}, 
    {label: 'February', value: 2},
	{label: 'March', value: 3},
	{label: 'April', value: 4},
	{label: 'May', value: 5},
	{label: 'June', value: 6},
	{label: 'July', value: 7},
	{label: 'August', value: 8},
	{label: 'September', value: 9},
	{label: 'October', value: 10},
	{label: 'November', value: 11},
	{label: 'December', value: 12}
]

const birthDays = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: '11', value: 11 },
    { label: '12', value: 12 },
    { label: '13', value: 13 },
    { label: '14', value: 14 },
    { label: '15', value: 15 },
    { label: '16', value: 16 },
    { label: '17', value: 17 },
    { label: '18', value: 18 },
    { label: '19', value: 19 },
    { label: '20', value: 20 },
    { label: '21', value: 21 },
    { label: '22', value: 22 },
    { label: '23', value: 23 },
    { label: '24', value: 24 },
    { label: '25', value: 25 },
    { label: '26', value: 26 },
    { label: '27', value: 27 },
    { label: '28', value: 28 },
    { label: '29', value: 29 },
    { label: '30', value: 30 },
    { label: '31', value: 31 }
 ]

const STATES = [ 
	{label: 'Alabama', value: 'AL'},
	{label: 'Alaska', value: 'AK'},
	{label: 'Arizona', value: 'AZ'},
	{label: 'Arkansas', value: 'AR'},
	{label: 'California', value: 'CA'},
	{label: 'Colorado', value: 'CO'},
	{label: 'Connecticut', value: 'CT'},
	{label: 'Delaware', value: 'DE'},
	{label: 'District of Columbia', value: 'DC'},
	{label: 'Florida', value: 'FL'},
	{label: 'Georgia', value: 'GA'},
	{label: 'Hawaii', value: 'HI'},
	{label: 'Idaho', value: 'ID'},
	{label: 'Illinois', value: 'IL'},
	{label: 'Indiana', value: 'IN'},
	{label: 'Iowa', value: 'IA'},
	{label: 'Kansas', value: 'KS'},
	{label: 'Kentucky', value: 'KY'},
	{label: 'Louisiana', value: 'LA'},
	{label: 'Maine', value: 'ME'},
	{label: 'Maryland', value: 'MD'},
	{label: 'Massachusetts', value: 'MA'},
	{label: 'Michigan', value: 'MI'},
	{label: 'Minnesota', value: 'MN'},
	{label: 'Mississippi', value: 'MS'},
	{label: 'Missouri', value: 'MO'},
	{label: 'Montana', value: 'MT'},
	{label: 'Nebraska', value: 'NE'},
	{label: 'Nevada', value: 'NV'},
	{label: 'New Hampshire', value: 'NH'},
	{label: 'New Jersey', value: 'NJ'},
	{label: 'New Mexico', value: 'NM'},
	{label: 'New York', value: 'NY'},
	{label: 'North Carolina', value: 'NC'},
	{label: 'North Dakota', value: 'ND'},
	{label: 'Ohio', value: 'OH'},
	{label: 'Oklahoma', value: 'OK'},
	{label: 'Oregon', value: 'OR'},
	{label: 'Pennsylvania', value: 'PA'},
	{label: 'Rhode Island', value: 'RI'},
	{label: 'South Carolina', value: 'SC'},
	{label: 'South Dakota', value: 'SD'},
	{label: 'Tennessee', value: 'TN'},
	{label: 'Texas', value: 'TX'},
	{label: 'Utah', value: 'UT'},
	{label: 'Vermont', value: 'VT'},
	{label: 'Virginia', value: 'VA'},
	{label: 'Washington', value: 'WA'},
	{label: 'West Virginia', value: 'WV'},
	{label: 'Wisconsin', value: 'WI'},
	{label: 'Wyoming', value: 'WY'}
]

const apiName = 'playercardsapi';
const excludedFields = ['league_admin_info','modified','date_added'] // fields we don't persist to the player table on PUT

const EditProfile = (props) => { 
	const s3StorageLevel = 'private';
	const [form] = Form.useForm();
	const [localProfileState, setLocalProfileState] = React.useState(props.profile)
	const [avatarState, setAvatarState] = React.useState();
	const [govIdState, setGovIdState] = React.useState();
	const [avatarDisplayState, setAvatarDisplayState] = React.useState('');
	const [avatarApprovalState, setAvatarApprovalState] = React.useState()
	const [birthYearsList, setBirthYearsList] = React.useState([]);
	const [birthFieldsRequired, setBirthFieldsRequired] = React.useState();
	const [profileStatus, setProfileStatus] = React.useState('');
	const [profileStatusTag, setProfileStatusTag] = React.useState('');
	const [fieldsDisableState, setFieldsDisabledState] = React.useState(false);
	const [profileVerifiedModalVisible, setProfileVerifiedModalVisible] = React.useState(false);

	const dateFormatList = ['MM/DD/YYYY', 'MM/DD/YY','YYYY-MM-DDTHH:mm:ss.000Z'];
	let initialValues = {
		...props.profile,
		// 'dateOfBirth': props.profile.dateOfBirth ? moment(props.profile.dateOfBirth, dateFormatList[0]) : null, //moment('01/01/2003', dateFormatList[0]),
	}

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

	  
	useEffect(() => {
		if(props.profile.avatarUrl){
			// downloadAvatarFromS3(props.profile.avatarUrl);
			setAvatarDisplayState(`${CLOUDFRONT_URL}${props.profile.avatarUrl}`)
			
		}
		setLocalProfileState(props.profile)
		form.resetFields()

		if(props.profile.profile_approval_status){
			const profileTag = determineProfileStatusTag(props.profile.profile_approval_status)
			setProfileStatusTag(profileTag)
			if(props.profile.profile_approval_status == 'VERIFIED'){
				setFieldsDisabledState(true)
				setProfileVerifiedModalVisible(true)
			}
		}
	}, [props.profile])


	useEffect(() => {
		const years = []
		const dateStart = moment().subtract(90, 'y')
	
		const dateEnd = moment().subtract(14, 'y')
	
		while (dateEnd.diff(dateStart, 'years') >= 0) {
		  years.push({label: dateStart.format('YYYY'), value: dateStart.format('YYYY')})
			// years.push(
			// 	<Option value={dateStart.format('YYYY')}>{dateStart.format('YYYY')}</Option>
			// )
		  dateStart.add(1, 'year')
		}
		setBirthYearsList(years)		
	}, [])

	const handleTagClick = (e) => {
		// console.log(e.target.innerText)
	}

	const determineProfileStatusTag = (profileStatus) => {
		let tagColor = '';
		let icon = null;
		if(profileStatus == 'PENDING_REVIEW'){
			tagColor = 'gold'
			icon = <ClockCircleOutlined />
		}
		else if (profileStatus == 'VERIFIED'){
			tagColor = 'green'
			icon = <CheckCircleOutlined />
		}
		return (
			<a onClick={handleTagClick}>
				<Tag 
					icon={icon} 
					color={tagColor} 
					key={profileStatus} 
					>
						{profileStatus}
						
				</Tag>
			</a>
		)
	}
	const putProfileUpdate = async (payload) => {
		const key = 'profileUpdated'
		message.loading({ content: 'Updating profile...', key });
		// console.log(payload)
        for(let k in payload){
            if(excludedFields.includes(k)){
                delete payload[k]
            }
        }
        try {
            const path =  `/profile/${props.profile.id}`;
            const myInit = {
              headers: {},
              response: true,
              body: payload,
            }

			API
			.put(apiName, path, myInit)
			.then(
				message.success({ content: "Profile updated!", key,  duration: 5 }),
				// props.getProfile(props.profile.id)
			)
        }
        catch(err) {
            console.log(err)
        }
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

	const onFinish = values => {
		const cleanedData = cleanFormData(values)
		putProfileUpdate({
			...cleanedData
		})
		.then(
			props.getProfile(props.profile.id)
		)
	};

	const onFinishFailed = errorInfo => {
		console.log('Failed:', errorInfo);
	};

	const getBase64 = (img, callback) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => callback(reader.result));
		reader.readAsDataURL(img);
	  }

	const onUploadAvatar = info => {
		const key = 'updatable';
		// const { contentType, fileName, IdImage, s3FileName } = govIdState;
		const fileNameGuid = uuidv4();
		const contentType = info.file.type
		const fileExtension = info.file.type.split('/')[1]
		const IdImage = info.file.originFileObj
		const s3FileName = `profilephotos/${fileNameGuid}.${fileExtension}`
		const storageLevel = 'public'

		if (info.file.status === 'uploading') {
			message.loading({ content: 'Uploading...', key, duration: 1000 });
			// console.log(info.file, info.fileList);
			
			return;
		}
		if (info.file.status === 'done') {
			try {
				// include delete of old photo here
				Storage.put(
					s3FileName, 
					IdImage, 
					{
						level: storageLevel,
						contentType: contentType
					})
				.then(response => {
					console.log('profile s3 key', response.key)
					message.success({ content: `Uploaded! ${info.file.name}`, key,  duration: 3 })
					putProfileUpdate({
						avatarUrl: `${response.key}`
					})
					.then(
						message.success({ content: `Profile Photo updated! ${info.file.name}`, key,  duration: 3 }),
						setAvatarDisplayState(`${CLOUDFRONT_URL}${response.key}`)
					)
					

					
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

	const onUploadGovernmentId = info => {
		const key = 'updatable';
		// const { contentType, fileName, IdImage, s3FileName } = govIdState;
		const fileNameGuid = uuidv4();
		const contentType = info.file.type
		const fileExtension = info.file.type.split('/')[1]
		const IdImage = info.file.originFileObj
		const s3FileName = `governmentid/${fileNameGuid}.${fileExtension}`
		const storageLevel = 'protected'

		if (info.file.status === 'uploading') {
			message.loading({ content: 'Uploading government id...', key, duration: 1000 });
			// console.log(info.file, info.fileList);
			
			return;
		}
		if (info.file.status === 'done') {
			Auth.currentUserCredentials()
			.then(currentUserCreds => {
				// include delete of old gov id here
				const userIdentity = currentUserCreds.identityId
				console.log('user identity', userIdentity)
				try {
					Storage.put(
						s3FileName, 
						IdImage, 
						{
							level: storageLevel,
							contentType: contentType,
							tagging: "governmentid=true"
						})
					.then(response => {
						putProfileUpdate({
							govIdUrl: `${storageLevel}/${userIdentity}/${response.key}`
						})
						.then(
							message.success({ content: `Government ID updated! ${info.file.name}`, key,  duration: 3 })
						)
					})
					.catch(error => {
						message.error({ content: `Something went wrong: ${error}`, key, duration: 3 })
					  })
				}
				catch (err) {
					// console.error(err);
					message.error({ content: `Something went wrong: ${err}`, key, duration: 3 })
				}
			})
			
			return;
		}
	};


	const amplifyUploadGovId = async govIdState => {
		
		const { contentType, fileName, IdImage, s3FileName } = govIdState;
		try {
			await Storage.put(
				s3FileName, 
				IdImage, {
					level: s3StorageLevel,
					contentType: contentType
				})
			.then(response => {
				setGovIdState(
					{
						...govIdState,
						s3Key: response.key
					}
				)
			})
			.catch(error => {
				console.log(error)
			  })
			// console.log(result)
			// setAvatarState({avatarUrl: result.key})
			// return result;
		}
		catch (err) {
			console.error(err);
		}
	}


	const onRemoveAvatar = () => {
		setAvatarDisplayState({})
		setAvatarState()
	}

	const amplifyUploadPhoto = async avatarState => {
		
		const { contentType, fileName, avatarImage, s3FileName } = avatarState;
		try {
			await Storage.put(
				s3FileName, // cloudfront/profilephotos/{random guid}?
				avatarImage, {
					level: s3StorageLevel, // 'public'?
					contentType: contentType
				})
			.then(response => {
				setAvatarState(
					{
						...avatarState,
						s3Key: response.key
						// avatarUrl ?
					}
				)
			})
			.catch(error => {
				console.log(error)
			  })
			// console.log(result)
			// setAvatarState({avatarUrl: result.key})
			// return result;
		}
		catch (err) {
			console.error(err);
		}
	}

	const downloadAvatarFromS3 = async options => {
		console.log(options)
		try {
			const result = await Storage.get(
				options.s3FileName, 
				{
					level: 'public',
					// download: true
				})
			console.log(result)
			setAvatarDisplayState({displayAvatar: result})

			return;
			
		}
		catch(err){
			console.log(err)
		}
	}

	const fieldChangeHandler= (event) => {
		if(event.hasOwnProperty('birthMonth') || event.hasOwnProperty('birthDay') || event.hasOwnProperty('birthYear')){
			setBirthFieldsRequired(true)
		}
	}

	const dummyRequest = ({ file, onSuccess }) => {
		setTimeout(() => {
		  onSuccess("ok");
		}, 0);
	  };


	const closeProfileVerifiedModal= () => {
		setProfileVerifiedModalVisible(false)
	}

	return (
		
		props.profile ?
		<>
			<Modal
			visible={profileVerifiedModalVisible}
			title="Your profile is verified!"
			footer={[
				<Button
				type="primary"
				onClick={() => closeProfileVerifiedModal()}
				>
					OK
				</Button>,
			]}
			>
				<p style={{'font-weight': 'bold'}}>What does this mean?</p>
				<p>In order for league officials to reliably verify who you are on game day, we lock the following fields until your next league registration or renewal:</p>
				<ul>
					<li>First and last name</li>
					<li>Birthdate</li>
					<li>Profile picture</li>
				</ul>
				<p>All other profile fields will continue to be updatable.</p>
				<p>For more information on why we do this and our profile verification process, please visit our <a>FAQ</a>.</p>
			</Modal>
			<Flex alignItems="center" mobileFlex={false} className="text-center text-md-left">
				<Avatar 
					size={90}
					src={avatarDisplayState ? avatarDisplayState : ''} 
					icon={<UserOutlined />}/> 
				
				<div className="ml-3 mt-md-0 mt-3">
					
					<Upload 
					onChange={onUploadAvatar} 
					showUploadList={false} 
					customRequest={dummyRequest} 
					accept={"image/png, image/jpeg, image/jpg"} 
					disabled={fieldsDisableState}
					>
						<Button type="primary">Change Avatar</Button>
					</Upload>
				</div>
				<div className="ml-3 mt-md-0 mt-3">
					<span>{profileStatusTag}</span>
				</div>
				
			</Flex>

			<div className="mt-4">
				<Form
					name="basicInformation"
					layout="vertical"
					form={form}
					initialValues={initialValues}
					onValuesChange={fieldChangeHandler}
					onFinish={onFinish}
					onFinishFailed={onFinishFailed}
					scrollToFirstError
				>
					<Row>
						<Col xs={24} sm={24} md={24} lg={24}>
							<Row gutter={ROW_GUTTER}> 
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label="First Name"
										name="firstName"
									>
										<Input 
										disabled={fieldsDisableState}
										/>
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label="Last Name"
										name="lastName"
									>
										<Input 
										disabled={fieldsDisableState}
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label="Birth Month"
										name="birthMonth"
										rules={[
											{
												required: birthFieldsRequired,
												message: 'Please enter a valid birth date'
											}
										]}
									>
										<Select 
										showSearch 
										disabled={fieldsDisableState}
										options={birthMonths} 
										onChange={fieldChangeHandler}
										optionFilterProp="label"
										filterOption={(input, option) =>
											option.label.toLowerCase().startsWith(input.toLowerCase())
										  }
										  filterSort={(optionA, optionB) =>
											optionA.label.toLowerCase().localeCompare(optionB.label.toLowerCase())
										  }
										/>

									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={6}>
									<Form.Item
										label="Birth Day"
										name="birthDay"
										rules={[
											{
												required: birthFieldsRequired,
												message: 'Please enter a valid birth date'
											}
										]}
									>
										<Select  
										disabled={fieldsDisableState}
										options={birthDays} />
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={8}>
									<Form.Item
										label="Birth Year"
										name="birthYear"
										rules={[
											{
												required: birthFieldsRequired,
												message: 'Please enter a valid birth date'
											}
										]}
									>
										<Select 
										disabled={fieldsDisableState} 
										showSearch
										options={birthYearsList} 
										optionFilterProp="label"
										filterOption={(input, option) =>
										  option.label.indexOf(input) >= 0
										}
										filterSort={(optionA, optionB) =>
											optionA.label.localeCompare(optionB.label)
										  }
										/>
									</Form.Item>
								</Col>
								
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Col xs={24} sm={24} md={8}>
									<Form.Item
										label="Phone Number"
										name="phoneNumber"
									>
										<Input />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Col xs={24} sm={24} md={24}>
									<Form.Item
										label="Address 1"
										name="address1"
									>
										<Input
											value={localProfileState.address1 || ''}
											placeholder="East 285th St."
										/>
									</Form.Item>
									<Form.Item
										label="Address 2"
										name="address2"
									>
										<Input
											placeholder="Apt 204" />
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label="City"
										name="city"
									>
										<Input />
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={6}>
									<Form.Item
										label="State"
										name="state"
									>
										<Select
											showSearch
											options={STATES}
											optionFilterProp="label"
											filterOption={(input, option) =>
												option.label.toLowerCase().startsWith(input.toLowerCase())
											  }
											  filterSort={(optionA, optionB) =>
												optionA.label.toLowerCase().localeCompare(optionB.label.toLowerCase())
											  }
										/>
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={6}>
									<Form.Item
										label="Post code"
										name="postCode"
									>
										<Input />
									</Form.Item>
								</Col>
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label="Country"
										name="country"

									>
										<Select
											showSearch
											options={COUNTRIES}
											optionFilterProp="label"
											filterOption={(input, option) =>
												option.label.toLowerCase().startsWith(input.toLowerCase())
											  }
											  filterSort={(optionA, optionB) =>
												optionA.label.toLowerCase().localeCompare(optionB.label.toLowerCase())
											  }
										/>
									</Form.Item>
								</Col>
								{/* </Col> */}
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Col xs={24} sm={24} md={12}>
									<Form.Item
										label={
											<span>
												Government ID&nbsp;
											<Tooltip title="Drivers license or passport id - .JPG or .PNG format only. This data will only be kept long enough for your league admin to approve it. Once approved, it will be deleted.">
													<QuestionCircleOutlined />
												</Tooltip>
											</span>
										}
									>
										<Upload
											onChange={onUploadGovernmentId}
											showUploadList={true}
											customRequest={dummyRequest}
											accept={"image/png, image/jpeg, image/jpg"}
										>
											<Button type="default">Upload ID</Button>
										</Upload>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Col xs={24} sm={24} md={24}>
									<Button type="primary" htmlType="submit">
										Save Changes
									</Button>
								</Col>
							</Row>
							<Row gutter={ROW_GUTTER}>
								<Form.Item
									name="agreement"
									valuePropName="checked"
									rules={[
										{
											required: true,
											message: 'Please read the agreement before updating your profile.',
										},
									]}
								>
									<Checkbox
										// onChange={updateReadAgreement}
										defaultChecked={false}
									>
										I have read the <a href="#">agreement</a>
									</Checkbox>
								</Form.Item>
							</Row>
						</Col>
					</Row>
				</Form>
			</div>
		</>
		:
		null
	)
}
const mapStateToProps = state => {
	const {profile} = state
	return {
		profile: profile
	}
}

const mapDispatchToProps = {
	updateProfile,
	getProfile
  }

export default connect(mapStateToProps, mapDispatchToProps)(EditProfile)
