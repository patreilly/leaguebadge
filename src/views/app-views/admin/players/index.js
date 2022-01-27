import React, { Component } from 'react'
import {useLocation, useHistory} from 'react-router-dom';
import { Card, Table, Tag, Tooltip, message, Button, Form, Select, Switch } from 'antd';
import { EyeOutlined, SyncOutlined, UserOutlined } from '@ant-design/icons';
import moment from 'moment';
import { connect } from 'react-redux';
import UserView from './UserView';
import AvatarStatus from 'components/shared-components/AvatarStatus';
import userData from "assets/data/user-list.data.json";
import { CSVLink } from "react-csv";

import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'
import Footer from 'rc-table/lib/Footer';

Amplify.configure(awsconfig);
const apiName = 'playercardsapi';
const { Option } = Select;
// export class UserList extends Component {
const Players = (props) => {
	const [userProfileVisible, setUserProfileVisible] = React.useState(false)
	const [selectedUser, setSelectedUser] = React.useState(null)
	const [leagueList, setLeagueList] = React.useState();
	const [selectedLeague, setSelectedLeague] = React.useState('')
	const [selectedMemberStatus, setSelectedMemberStatus] = React.useState('')
	const [filterProfileApprovals, setFilterProfileApprovals] = React.useState(false)
	const [defaultSelectedLeague, setDefaultSelectedLeague] = React.useState()
	const [users, setUsers] = React.useState([])
	const [form] = Form.useForm();

	let history = useHistory();
	let location = useLocation()
	const search = location.search;
	let currentUrlParams = new URLSearchParams(search);
	

	React.useEffect(() => {
		// console.log('form change')
		let paramLeagueId = currentUrlParams.get('leagueid')
		if (leagueList && form){
			form.setFieldsValue({leagueid: paramLeagueId}) // apparently doesn't trigger onValuesChange?
			setSelectedLeague(paramLeagueId)
		}
	}, [form, leagueList])

	React.useEffect(() => {
		if(selectedLeague != ''){
			const path = `/admin/members`;
			const myInit = {
			  headers: {},
			  response: true,
			  queryStringParameters: { 
				league_id: selectedLeague,
				cloudfront_url: CLOUDFRONT_URL
			}
			}
			API
			.get(apiName, path, myInit)
			.then((response) => {
				setUsers(response.data)
				// console.log('users', response.data)
			})
		}
	}, [selectedLeague])


	React.useEffect(() => {
		if (props.profile.league_admin_info){
			setLeagueList(props.profile.league_admin_info)
		  }
	}, [props.profile])


	// React.useEffect(() => {
	// 	if (leagueList && leagueList.length > 0){
	// 		let leagueId = currentUrlParams.get('leagueid')
	// 		if (leagueId && leagueId in leagueList){
	// 			// setSelectedLeague(leagueId)
	// 			// console.log({leagueid: leagueId})
	// 			// form.setFieldsValue({leagueid: leagueId})
	// 			// setDefaultSelectedLeague(leagueList[0].leagueid)
	// 		}
	// 	  }
	// }, [leagueList])

	const deleteUser = userId => {
		// this.setState({
		// 	users: this.state.users.filter(item => item.id !== userId),
		// })
		// setUsers({
		// 	users: this.state.users.filter(item => item.id !== userId),
		// })
		message.success({ content: `Deleted user ${userId}`, duration: 2 });
	}

	const showUserProfile = userInfo => {
		// console.log(userInfo)
		setSelectedUser(userInfo)
		setUserProfileVisible(true)
	};
	
	const closeUserProfile = () => {
		setSelectedUser(null)
		setUserProfileVisible(false)
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
		return (
			<Tag className ="text-capitalize" color={tagColor}>{status}</Tag>
		)
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


	const onLeagueSelectChange = (event) => {
		console.log(event)
		setSelectedLeague(event.leagueid)
		currentUrlParams.set('leagueid', event.leagueid)
		history.push(location.pathname + '?' + currentUrlParams.toString())
	}

	const onMemberStatusSelectChange = (event) => {
		setSelectedMemberStatus(event)
	}

	const handleRefreshClick = () => {
		console.log('selectedLeague', selectedLeague)
		if(selectedLeague != ''){
			try {
				const path = `/admin/members`;
				const myInit = {
				  headers: {},
				  response: true,
				  queryStringParameters: { 
					league_id: selectedLeague,
				}
				}
				API
				.get(apiName, path, myInit)
				.then((response) => {
					setUsers(response.data)
					console.log('users', response.data)
				})		
			} catch (error) {
				console.log(error)
			}
		}
	}

	const handleFilterProfileApprovals = (enable) => {
		setFilterProfileApprovals(enable)
	}

	const tableColumns = [
		{
			title: 'Player',
			dataIndex: 'player',
			render: (_, record) => (
				<div className="d-flex">
					<AvatarStatus 
						src={`${CLOUDFRONT_URL}${record.avatarUrl}`} 
						name={`${record.firstName} ${record.lastName}`} 
						subTitle={record.email}
						/>
				</div>
			),
			sorter: {
				compare: (a, b) => {
					a = a.name.toLowerCase();
					b = b.name.toLowerCase();
					return a > b ? -1 : b > a ? 1 : 0;
				},
			},
		},
		{
			title: 'Member ID',
			dataIndex: 'id',
			key: 'id',
			render: text => text,
			sorter: (a, b) => a.id.length - b.id.length,
			sortDirections: ['descend','ascend'],
		},
		{
			title: 'Membership ID',
			dataIndex: 'membershipid',
			key: 'membershipid',
			render: text => text,
			sorter: (a, b) => a.membershipid.length - b.membershipid.length,
			sortDirections: ['descend','ascend'],
		},
		{
			title: 'Program ID',
			dataIndex: 'programid',
			key: 'programid',
			render: text => text,
			sorter: (a, b) => a.programid.length - b.programid.length,
			sortDirections: ['descend','ascend'],
		},
		{
			title: 'Registered',
			dataIndex: 'registrationDate',
			render: (_, record) => (
				<span>{moment(record.registration_date).format('MM/DD/YYYY hh:mm a')}</span>
			),
			sorter: (a, b) => moment(a.registration_date).format('MM/DD/YYYY hh:mm a') - moment(b.expiration_date).format('MM/DD/YYYY hh:mm a')
		},
		{
			title: 'Expires',
			dataIndex: 'expirationDate',
			render: (_, record) => (
				<span>{moment(record.expiration_date).format('MM/DD/YYYY hh:mm a')}</span>
			),
			sorter: (a, b) => moment(a.expiration_date).format('MM/DD/YYYY hh:mm a') - moment(b.expiration_date).format('MM/DD/YYYY hh:mm a')
		},
		{
			title: 'Member Status',
			dataIndex: 'status',
			render: status => (
				// <Tag className ="text-capitalize" color={status === 'PENDING'? 'yellow' : 'red'}>{status}</Tag>
				memberStatusTag(status)
			),
			sorter: {
				compare: (a, b) => a.status.length - b.status.length,
			},
			filters: [
				{
					text: 'ELIGIBLE',
					value: 'ELIGIBLE'
				},
				{
					text: 'SUSPENDED',
					value: 'SUSPENDED'
				},
				{
					text: 'PENDING',
					value: 'PENDING'
				},
			],
			onFilter: (value, record) => record.status.indexOf(value) === 0,
		},
		{
			title: 'Profile Status',
			dataIndex: 'profile_approval_status',
			render: profileStatus => (
				// <Tag className ="text-capitalize" color={status === 'PENDING'? 'yellow' : 'red'}>{status}</Tag>
				getProfileApprovalStatusColor(profileStatus)
			),
			sorter: {
				compare: (a, b) => a.profileStatus.length - b.profileStatus.length,
			},
			filters: [
				{
					text: 'VERIFIED',
					value: 'VERIFIED'
				},
				{
					text: 'PENDING_REVIEW',
					value: 'PENDING_REVIEW'
				}
			],
			onFilter: (value, record) => record.profile_approval_status.indexOf(value) === 0,
		},
		{
			title: '',
			dataIndex: 'actions',
			render: (_, elm) => (
				<div className="text-right">
					<Tooltip title="View">
						<Button type="primary" className="mr-2" icon={<EyeOutlined />} onClick={() => {showUserProfile(elm)}} size="small"/>
					</Tooltip>
					{/* <Tooltip title="Review Profile">
						<Button className="mr-2" icon={<UserOutlined />} onClick={() => {showUserProfile(elm)}} size="small"/>
					</Tooltip> */}
					{/* <Tooltip title="Delete">
						<Button danger icon={<DeleteOutlined />} onClick={()=> {deleteUser(elm.id)}} size="small"/>
					</Tooltip> */}
				</div>
			)
		}
	];

	return (
		<div>
			{/* <Form
			layout="inline"
			className="components-table-demo-control-bar"
			style={{ marginBottom: 16 }}
			>
				<Form.Item 
				name="leagueId"
				label="League">
					<Select 
					style={{ width: 250 }}
					onChange={onLeagueSelectChange}
					>
					{
						leagueList ?
						leagueList.map((league) => 
						<Option key={league.id} value={league.id}>{league.name}</Option>
						)
						:
						null
					}
					</Select>
				</Form.Item>
			</Form> */}
			<Card bodyStyle={{'padding': '0px'}}>
				<Form
				form={form}
				onValuesChange={onLeagueSelectChange}
				layout="inline"
				className="components-table-demo-control-bar"
				style={{ 
					marginBottom: 16,
					float: 'right'
				}}
				>
				<Form.Item
				label={"Profile Approvals"}
				>
					<Switch checked={filterProfileApprovals} onChange={handleFilterProfileApprovals} />
				</Form.Item>
				<Form.Item label="League" name="leagueid">
					<Select 
						style={{ 
							width: 250,
							margin: '10px'
						}}
						// onChange={onLeagueSelectChange}
						// defaultValue={'Pick a league...'}
						>
						{
							leagueList ?
							leagueList.map((league) => 
							<Option key={league.id} value={league.id}>{league.name}</Option>
							)
							:
							null
						}
					</Select>
				</Form.Item>
				<Form.Item>
					<Button
					onClick={handleRefreshClick}
					style={{
						margin: '10px'
					}}
					>
						<SyncOutlined />	
					</Button> 
				</Form.Item>
				</Form>

				<Table 
					columns={tableColumns} 
					dataSource={users} 
					rowKey='id' 
				/>
				<>
					{
						users.length > 0 ?
						<CSVLink data={users} filename={`${selectedLeague.split(' ').join('-')}-players.csv`}>
							<Button
								style={{
									margin: '10px',
									float: 'right'
								}}
								>
								Download Players CSV
							</Button>
						</CSVLink>
						:
						null
					}
				</>
				
				<UserView data={selectedUser} visible={userProfileVisible} selectedLeague={selectedLeague} close={()=> {closeUserProfile()}}/>
				
			</Card>
		</div>
	)
	
}


const mapStateToProps = state => {
	const {profile} = state
	return {
		profile: profile
	}
}

export default connect(mapStateToProps, null)(Players)
