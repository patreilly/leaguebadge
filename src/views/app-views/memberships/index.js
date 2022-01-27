import React, { useEffect } from 'react'
import { Table, Divider, Tag, List, Button, Card } from 'antd';
import { connect } from 'react-redux';
import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../aws-exports';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../configs/AppConfig'
import moment from 'moment';

Amplify.configure(awsconfig);
const { Meta } = Card;

const Memberships = (props) => {

	const columns = [
		{
			title: 'Membership Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Status',
			dataIndex: 'member_status',
			key: 'member_status',
			render(memberStatus){
				let tagColor = 'blue';
				if(memberStatus == 'PENDING'){
					tagColor = 'gold'
				}
				else if(memberStatus == 'ELIGIBLE'){
					tagColor = 'green'
				}
				else if(memberStatus == 'SUSPENDED'){
					tagColor = 'red'
				}
				else {
					tagColor = 'blue'
				}
				return (
					<span>
					<Tag color={tagColor} key={memberStatus}>{memberStatus}</Tag>
					</span>
				)
			},
		},
		{
			title: 'Expires',
			//   key: 'action',
			render: (record) => (
				moment(record.expiration_date).format('MM/DD/YYYY hh:mm a')
			),
		},
		{
			title: 'Earliest Renew',
			//   key: 'action',
			render: (record) => {
				const expirationDate = moment(record.expiration_date)
				const earliestRenewalDateTime = expirationDate.subtract(record.renewalWindowAmt, record.renewalWindowBasis)
				return moment(earliestRenewalDateTime).format('MM/DD/YYYY hh:mm a')
			},
		},
		{
			title: 'Program',
			dataIndex: 'program',
			key: 'program',
			render: text => <a>{text}</a>,
			sorter: (a, b) => a.program.length - b.program.length,
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'League',
			dataIndex: 'league',
			key: 'league',
			render: text => <a>{text}</a>,
			sorter: (a, b) => a.league.length - b.league.length,
			sortDirections: ['descend', 'ascend'],
		},
		// {
		//   title: 'Age',
		//   dataIndex: 'age',
		//   key: 'age',
		// },
		// {
		//   title: 'Address',
		//   dataIndex: 'address',
		//   key: 'address',
		// },
		{
			title: 'Action',
			//   key: 'action',
			render: (record) => (
				<span>
					{
						renewLinkEnabled(record) ?
						<a href={`${APP_PREFIX_PATH}/register/${record.membershipid}`}>Renew</a>
						:
						null
					}
					{/* <Divider type="vertical" />
					<a>Delete</a> */}
				</span>
			),
		},
		
	];

	const renewLinkEnabled = (membership) => {
		// console.log('membership', membership)
		let enabled = false
		if(props.profile.memberships){
			for (var i=0;i<props.profile.memberships.length;i++){
				if(props.profile.memberships[i].membershipid == membership.membershipid){
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
		// console.log('renew link enabled:',enabled)
		return enabled
	}

	return (
		<div>
			<h2>Your Memberships</h2>
			{
				props.profile.memberships ?
				<Table 
					columns={columns} 
					dataSource={
						props.profile.memberships ?
						props.profile.memberships.map(membership => {
							let newObj = {}
							newObj['key'] = membership.id
							newObj['membershipid'] = membership.membershipid
							newObj['expiration_date'] = membership.expiration_date
							newObj['renewalWindowBasis'] = membership.membership_details.membership_info.renewalWindowBasis
							newObj['renewalWindowAmt'] = membership.membership_details.membership_info.renewalWindowAmt
							newObj['name'] = membership.membership_details.membership_info.name
							newObj['member_status'] = membership.status
							newObj['program'] = membership.membership_details.program_info.name
							newObj['league'] = membership.membership_details.league_info.name
							return newObj
						})
						:
						null
					}
				/>
				:
				null
			}
		</div>
	)
}

const mapStateToProps = state => {

	const {profile} = state
	return {
		profile: profile
	}

}

export default connect(mapStateToProps, null)(Memberships)
