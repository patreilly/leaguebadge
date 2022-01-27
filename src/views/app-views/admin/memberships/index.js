import React from 'react'
import { EditOutlined, EllipsisOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { List, Button, Card } from 'antd';
import { Link } from 'react-router-dom';
import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'


Amplify.configure(awsconfig);
const { Meta } = Card;
const apiName = 'playercardsapi';
const defaultLogo = 'https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png'

const AdminMemberships = () => {
	const [membershipsState, setMembershipsState] = React.useState();
	const [loadingState, setLoadingState] = React.useState({loading: true})
	React.useEffect(() => {
		// console.log('making get request to members')
        const path = `/admin/memberships`;
        const myInit = {
          headers: {},
          response: true,
        }
		API
		.get(apiName, path, myInit)
		.then((response) => {
			setMembershipsState(response.data)
			// console.log(response.data)
		})
	}, [])

	React.useEffect(() => {
		setLoadingState({loading: false})
	}, [membershipsState])

	return (
		<div>
			<h1>Memberships Administration</h1>
			<Link to={'create-membership'}>
				<Button type="primary">
					<EditOutlined/>
					<span>Create Membership</span>
				</Button>
			</Link>
			<br/>
			<br/>
			<p>Memberships represent different types of relationships a person can have with your program.
				A program may have only one membership and some may have many. 
				These are often referred to as tiers, such bronze, silver and gold tiers, that offer differeniated value to your member.
				</p>
			<p>More on Memberships. They...</p>
			<ul>
				<li>Offer varying benefits to the person such as: time duration, access to events, or special offers</li>
				<li>Dictate things such as price, renewal rules, and card design</li>
				<li>Appear in the league marketplace for people to join, if they are set to Public.</li>
			</ul>
			<br/>
			<br/>
			<List
				grid={{
					gutter: 16,
					// column: 4
					// xs: 1,
					// sm: 2,
					// md: 4,
					// lg: 4,
					// xl: 6,
					// xxl: 3,
				}}
				dataSource={membershipsState}
				// loading={loadingState.loading}
				renderItem={item => (
					<List.Item>
						<Card
							style={{ width: 400 }}
							title={item.league_info.name}
							cover={
							<img
								alt="league logo"
								src={item.league_info.logo_url ? `${CLOUDFRONT_URL}${item.league_info.logo_url}` : defaultLogo}
							/>
							}
							actions={[
							<Link to={{
								pathname: `${APP_PREFIX_PATH}/admin/edit-membership/${item.id}`,
								state: item
							}}><SettingOutlined key="setting"/></Link>,
							<InfoCircleOutlined key="info" />,
							<EllipsisOutlined key="ellipsis" />,
							]}
							>
								<Meta
								title={item.name}
								description={item.membershipDesc}
								/>
						</Card>
					</List.Item>
				)}
			/>
		</div>	
	)
}

export default AdminMemberships
