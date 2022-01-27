import React from 'react';
import { Drawer, Divider, Tag, Button, Image, Select, Input, Form, Tooltip, DatePicker, message } from 'antd';
import { 
	MobileOutlined, 
	MailOutlined, 
	UserOutlined, 
	CompassOutlined,
	CalendarOutlined,
	AuditOutlined,
	IdcardOutlined,
	QuestionCircleOutlined
} from '@ant-design/icons';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'
import moment from 'moment';
import Modal from 'antd/lib/modal/Modal';

import Amplify, { API, Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const apiName = 'playercardsapi';
const { Option } = Select;
const dateFormatList = ['MM/DD/YYYY', 'MM/DD/YY','YYYY-MM-DDTHH:mm:ss.000Z'];
const formItemLayout = {
	labelCol: {
	  xs: {
		span: 8,
	  },
	  sm: {
		span: 8,
	  },
	},
	wrapperCol: {
	  xs: {
		span: 16,
	  },
	  sm: {
		span: 16,
	  },
	},
  };
  

const UserView = (props) => {

	const { data, visible, close, selectedLeague} = props;
	const [userData, setUserData] = React.useState(null);
	const [initialValues, setInitialValues] = React.useState({})
	const [profileApproveModalVisible, setProfileApproveModalVisible] = React.useState(false);
	const [showApprovalButton, setShowApprovalButton] = React.useState(false)
	const [govId, setGovId] = React.useState(null)

	const [form] = Form.useForm();

	React.useEffect(() => {
		if(props.data){
			setUserData(data)
			// console.log(data)
		}
	}, [props])

	React.useEffect(() => {
		if(userData){
			setInitialValues({
				...userData,
				'status': userData.status,
				'status_desc': userData.status_desc,
				'statusExpDate': userData.statusExpDate ? moment(userData.statusExpDate, dateFormatList[2]) : "", 
			  })

			if(userData.profile_reviewer && userData.profile_reviewer == selectedLeague){
				setShowApprovalButton(true)
			}
			if('govIdUrl' in userData){
				getGovernmentIdUrl(userData.govIdUrl)
			}
		}

	}, [userData])

	React.useEffect(() => {
		// console.log('initial values', initialValues)
		form.resetFields()
	  }, [initialValues])

	const getMemberStatusColor = status => {
		let tagColor = 'yellow'
		switch(status) {
			case 'PENDING':
				tagColor = 'yellow';
				break;
			case 'VERIFIED':
				tagColor = 'green';
				break;
			case 'SUSPENDED':
				tagColor = 'red';
				break;
			default:
				tagColor = 'yellow'

		}
		return tagColor
	}


	const getProfileApprovalStatusColor = status => {
		let tagColor = '#BABABA'
		switch(status) {
			case 'PENDING_REVIEW':
				tagColor = 'yellow';
				break;
			case 'VERIFIED':
				tagColor = 'green';
				break;
			default:
				tagColor = '#BABABA'

		}
		return tagColor
	}

	const  getGovernmentIdUrl = async (s3Key) => {
		const identity = s3Key.split('/')[1]
		const s3KeyToGet = s3Key.split(`${identity}/`)[1]
		try {
			await Storage.get(
				s3KeyToGet,
				{
					level: 'protected',
					identityId: identity,
					download: false,
					expires: 900
				}
			)
			.then(response => {
				setGovId(response)
			})
		} catch (error) {
			console.log(error)
			setGovId(null)
		}
	}


	const profileApprovalModal = (event) => {
		console.log(event)
		setProfileApproveModalVisible(true)
	}


	const handleApproveClick = (memberId) => {
		console.log(memberId)
		const key = 'profileApprove';
		try {
			// make profile approval call here
			const path = `/admin/profile/approve`;
			const myInit = {
			headers: {},
			response: true,
			queryStringParameters: {
				memberId: memberId,
				approver: selectedLeague
				}
			}
			API
			.put(apiName, path, myInit)
			.then((response) => {
				console.log('approval response', response)
				
				if(response.status == 200){
					message.success({ content: 'Profile approved. Refresh to see changes.', key, duration: 3 })
					setProfileApproveModalVisible(false)
				}
				else {
					message.error({ content: 'Error: Profile not approved.', key, duration: 3 })
					setProfileApproveModalVisible(false)
				}
			})
		} catch (error) {
			message.error({ content: 'Error: Profile not approved.', key, duration: 3 })
			setProfileApproveModalVisible(false)
		}

	}

	const closeProfileApproveModal = () => {
		setProfileApproveModalVisible(false)
	}
	

	const updateMemberStatus = values => {
		const key = 'memberStatusUpdate';
		try {
			
			const path = `/admin/member/${userData.id}`;
			const myInit = {
			  headers: {},
			  response: true,
			  body: values
			}
			API
			.put(apiName, path, myInit)
			.then((response) => {
				console.log('member updated', response)
				if(response.status == 200){
					message.success({ content: 'Member updated. Refresh to see changes.', key, duration: 3 })
					setUserData(null)
					close()
				}
				else {
					message.error({ content: 'Error: Member not updated.', key, duration: 3 })
				}
				
			})
		} catch (error) {
			message.error({ content: 'Error: Member not updated.', key, duration: 3 })
		}

	}

	const memberStatusTag = (memberStatus) => {
		let tagColor;
		switch(memberStatus){
			case 'ELIGIBLE':
				tagColor = 'green'
				break;
			case 'PENDING':
				tagColor = 'yellow'
				break;
			case 'SUSPENDED':
				tagColor = 'red'
				break;
			case 'EXPIRED':
				tagColor = 'red'
				break;
			default:
				tagColor = 'grey'
		}	
		return (
			<Tag className ="text-capitalize" color={tagColor}>{memberStatus}</Tag>
		)
	}

	return (
		userData ?
		<Drawer
			width={500}
			placement="right"
			onClose={close}
			closable={false}
			visible={visible}
		>
			<div className="text-center mt-3">
				{/* <Avatar size={200} src={userData.avatarUrl ? `${CLOUDFRONT_URL}${userData.avatarUrl}` : ''} /> */}
				<Image
					width={200}
					src={userData.avatarUrl ? `${CLOUDFRONT_URL}${userData.avatarUrl}` : ''}
					preview={{
						src: userData.avatarUrl ? `${CLOUDFRONT_URL}${userData.avatarUrl}` : '',
					}}
					/>
				<h3 className="mt-2 mb-0">{`${userData.firstName} ${userData.lastName}`}</h3>
				<span>
					{
						userData.birthDay ?
						moment(`${userData.birthMonth}/${userData.birthDay}/${userData.birthYear}`).toNow(true) + ' old'
						:
						'No birthdate specified'
					}
				</span>
			</div>
			<Divider dashed />
			<div className="mt-5">
				<h6 className="text-muted text-uppercase mb-3">Member Details</h6>
				<div>
					<AuditOutlined /> 
					<span className="ml-3 text-dark">Member Status:  </span>
					<span>{memberStatusTag(userData.status)}</span>
					
				</div>
				<div>
					<UserOutlined />
					<span className="ml-3 text-dark">Member ID: {userData.id}</span>
				</div>
				<div>
					<CalendarOutlined />
					<span className="ml-3 text-dark">Registered: {moment(userData.registration_date).format('MM/DD/YYYY hh:mm a')}</span>
				</div>
				<div>
					<CalendarOutlined />
					<span className="ml-3 text-dark">Expires: {moment(userData.expiration_date).format('MM/DD/YYYY hh:mm a')}</span>
				</div>

			</div>
			<div className="mt-5">
				<h6 className="text-muted text-uppercase mb-3">Player Profile</h6>
				<div>
					<AuditOutlined /> 
					<span className="ml-3 text-dark">Profile Status: </span>
					<span><Tag className ="text-capitalize" color={getProfileApprovalStatusColor(userData.profile_approval_status)}>{userData.profile_approval_status ? userData.profile_approval_status : 'UNVERIFIED'}</Tag></span>
					
				</div>
				<div>
					<CalendarOutlined />
					{	
						userData.birthDay ?
						<span className="ml-3 text-dark">DOB: {`${userData.birthMonth}/${userData.birthDay}/${userData.birthYear}`}</span>
						:
						<span className="ml-3 text-dark">No birthdate specified</span>
					}
				</div>
				<div>
					<MobileOutlined />
					<span className="ml-3 text-dark">{userData.phoneNumber ? userData.phoneNumber : '-'}</span>
				</div>
				<div>
					<MailOutlined />
					<span className="ml-3 text-dark">{userData.email}</span>
				</div>
				<div>
					<CompassOutlined />
					<span className="ml-3 text-dark">{userData.city && userData.state ? `${userData.city}, ${userData.state}` : ''}</span>
				</div>
				<div>
					<IdcardOutlined />
					<span className="ml-3 text-dark">Government ID:  </span>
					<br/>
					{
						govId ?
						<span>
							<Image
							width={50}
							src={govId}
							preview={{
								src: govId
							}}
							/>
						</span>
						:
						<span className="ml-3 text-dark">No government id available</span>
					}
				</div>
			</div>
			<Divider dashed />
			<div className="mt-5">
				<h6 className="text-muted text-uppercase mb-3">League Actions</h6>
				{
					showApprovalButton ?
					<Button
					onClick={() => profileApprovalModal(userData.id)}
					>
						Approve Profile
					</Button>
					:
					null
				}
			</div>
			{/* <Divider dashed /> */}
			<div className="mt-5">
				{/* <h6 className="text-muted text-uppercase mb-3">Update Player Status</h6> */}
				<Form
					{...formItemLayout}
					form={form}
					name="updateMemberStatus"
					onFinish={updateMemberStatus}
					initialValues={initialValues}
					>
					<Form.Item
						name="status"
						label={
							<span>
								Status&nbsp;
								<Tooltip title="This status will appear on the player's digital card if available.">
								<QuestionCircleOutlined />
								</Tooltip>
							</span>
							}>
						<Select style={{ width: 250 }}>
							<Option key={'PENDING'} value={'PENDING'}>PENDING</Option>
							<Option key={'SUSPENDED'} value={'SUSPENDED'}>SUSPENDED</Option>
							<Option key={'ELIGIBLE'} value={'ELIGIBLE'}>ELIGIBLE</Option>
						</Select>
					</Form.Item>
					<Form.Item
						name="statusExpDate"
						label={
							<span>
								Status&nbsp;Expiration Date&nbsp;
								<Tooltip title="Date at midnight to end this status">
								<QuestionCircleOutlined />
								</Tooltip>
							</span>
							}>
						<DatePicker  
						format={dateFormatList[0]}
						value={userData.statusExpDate ? moment(userData.statusExpDate, dateFormatList[2]) : ""}
						/>
					</Form.Item>
					<Form.Item
						name="status_desc"
						label={
							<span>
								Notes&nbsp;
								<Tooltip title="These notes will appear on the player's digital card if available.">
								<QuestionCircleOutlined />
								</Tooltip>
							</span>
							}>
						<Input placeholder="Player is eligible for play" />
					</Form.Item>
					<Button type="primary" htmlType="submit">
						Update Member Status
					</Button>
				</Form>
			</div>
			<Modal
			visible={profileApproveModalVisible}
			onCancel={closeProfileApproveModal}
			footer={[
				<Button
				type="primary"
				onClick={() => handleApproveClick(userData.id)}
				>
					I Approve
				</Button>,
				<Button 
				onClick={() => closeProfileApproveModal()}
				>
					Cancel
				</Button>
			]}
			>
				<p>This program uses a profile approval process.</p>
				<p>Click "I Approve" for mark this user as "VERIFIED" or "Cancel" to exit.</p>
			</Modal>

		</Drawer>
		:
		null
	)

}

export default UserView
