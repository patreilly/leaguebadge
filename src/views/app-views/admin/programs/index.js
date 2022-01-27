import React, { useEffect } from 'react'
import { Table, Divider, Tag, List, Button } from 'antd';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
import ReactDOM from 'react-dom';
import { MessageOutlined, LikeOutlined, StarOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import Amplify, { Storage } from 'aws-amplify';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'

import {EditLeague} from '../edit-league'


import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const columns = [
	// {
	// 	title: 'ID',
	// 	dataIndex: 'id',
	// 	key: 'id',
	// },
	{
	  title: 'Program Name',
	  render: record => <a href={`${APP_PREFIX_PATH}/admin/edit-program/${record.key}`}>{record.name}</a>,
	},
	{
		title: 'League',
		dataIndex: 'league',
		key: 'league',
		render: text => <a>{text}</a>,
		sorter: (a, b) => a.league.length - b.league.length,
		sortDirections: ['descend','ascend'],
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
	// {
	//   title: 'Tags',
	//   key: 'tags',
	//   dataIndex: 'tags',
	//   render: tags => (
	// 	<span>
	// 	  {tags.map(tag => {
	// 		let color = tag.length > 5 ? 'geekblue' : 'green';
	// 		if (tag === 'loser') {
	// 		  color = 'volcano';
	// 		}
	// 		return (
	// 		  <Tag color={color} key={tag}>
	// 			{tag.toUpperCase()}
	// 		  </Tag>
	// 		);
	// 	  })}
	// 	</span>
	//   ),
	// },
	{
	  title: 'Action',
	//   key: 'action',
	  render: (record) => (
		<span>
		  <a href={`${APP_PREFIX_PATH}/admin/edit-program/${record.key}`}>Edit</a>
		  <Divider type="vertical" />
		  <a>Delete</a>
		</span>
	  ),
	},
  ];
  
//   const data = [
// 	{
// 	  key: '1',
// 	  name: 'John Brown',
// 	  age: 32,
// 	  address: 'New York No. 1 Lake Park',
// 	  tags: ['nice', 'developer'],
// 	},
// 	{
// 	  key: '2',
// 	  name: 'Jim Green',
// 	  age: 42,
// 	  address: 'London No. 1 Lake Park',
// 	  tags: ['loser'],
// 	},
// 	{
// 	  key: '3',
// 	  name: 'Joe Black',
// 	  age: 32,
// 	  address: 'Sidney No. 1 Lake Park',
// 	  tags: ['cool', 'teacher'],
// 	},
//   ];

const AdminPrograms = (props) => {

	// React.useEffect(() => {
		// console.log(props.profile)
	// }, [props.profile])

	return (
		<div>
			<h1>Programs Administration</h1>
			<Link to={'create-program'}>
				<Button type="primary">
					<EditOutlined/>
					<span>Create Program</span>
				</Button>
			</Link>
			<br/>
			<br/>
			<p>Programs represent an offering from your organization from which many membership types can be created. Programs can span any amount of time, or last forever.</p>
			<p></p>

			<Table 
				columns={columns} 
				dataSource={
					props.profile.league_admin_info ?
					props.profile.league_admin_info.map(league => {
						let program = league.programs.map(program => {
							let newObj = {}
							newObj['key'] = program.id
							// newObj['id'] = program.id
							newObj['name'] = program.name
							newObj['league'] = league.name
							return newObj
						})
						return program
					}).filter(program => program.length > 0).flat()
					:
					null
				}
			/>
		</div>	
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

export default connect(mapStateToProps, mapDispatchToProps)(AdminPrograms)
