import React, { useEffect } from 'react'
import { connect } from 'react-redux';
import ReactDOM from 'react-dom';
import { List, Tag, Button } from 'antd';
import { MessageOutlined, LikeOutlined, StarOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import Amplify, { Storage } from 'aws-amplify';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'

import {EditLeague} from '../edit-league'


import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const defaultLogo = 'https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png'

const IconText = ({ icon, text }) => (
  <span>
    {React.createElement(icon, { style: { marginRight: 8 } })}
    {text}
  </span>
);

const AdminLeagues = (props) => {
	// console.log(props.profile.league_admin_info)
	const [leagueAdminInfo, setLeagueAdminInfo] = React.useState();

	React.useEffect(() => {
		// console.log(CLOUDFRONT_URL)
		// console.log(props.profile.league_admin_info)
		if(props.profile.league_admin_info){
			console.log('leage admin info found')
			setLeagueAdminInfo(props.profile.league_admin_info)
		}
	},[props.profile])

	const downloadAvatarFromS3 = async options => {
		console.log(options)
		try {
			const result = await Storage.get(
				options, 
				{level: 'public'}
				)
			return result;
		}
		catch(err){
			console.log(err)
		}
	}

	return (
		<div>
			<h1>Leagues Administration</h1>
			<Link to={'create-league'}>
				<Button type="primary">
					<EditOutlined/>
					<span>Create League</span>
				</Button>
			</Link>
			{
				leagueAdminInfo ?
				<List
				itemLayout="vertical"
				size="large"
				pagination={{
				onChange: page => {
					console.log(page);
				},
				pageSize: 3,
				}}
				dataSource={leagueAdminInfo}
				// footer={
				// <div>
				// 	<b>ant design</b> footer part
				// </div>
				// }
				renderItem={item => (
				<List.Item
					key={item.id}
					actions={[
					<IconText icon={StarOutlined} text="156" key="list-vertical-star-o" />,
					item.isPublic ? <Tag color="lime">Public</Tag> : <Tag color="yellow">Private</Tag>,
					<IconText icon={LikeOutlined} text="156" key="list-vertical-like-o" />,
					<IconText icon={MessageOutlined} text="2" key="list-vertical-message" />,
					]}
					extra={
						item.logo_url ?
						<img
							width={272}
							alt="logo" 
							src={`${CLOUDFRONT_URL}${item.logo_url}`}
						/> :
						<img 
							width={272}
							alt="logo"
							src={defaultLogo}
							/>
					}
				>
					<List.Item.Meta
					avatar={item.isActive ?  <Tag color="lime">Active</Tag> : <Tag color="blue">Inactive</Tag>}

					title={<a href={`${APP_PREFIX_PATH}/admin/edit-league/${item.id}`}>{item.name}</a>}
					// title={<EditLeague props={item}/>}
					description={item.leagueDesc}
					/>
					{/* {item.content} */}
				</List.Item>
				)}
			/>
			:
			<p> You don't administer any leagues yet. </p>
			}

		</div>	
	)
}

// export default AdminLeagues

const mapStateToProps = state => {

	const {profile} = state
	return {
		profile: profile
	}

}

const mapDispatchToProps = {
  
  }

export default connect(mapStateToProps, mapDispatchToProps)(AdminLeagues)
