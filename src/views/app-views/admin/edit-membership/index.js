import React, { useEffect } from 'react'
import { Provider, connect } from 'react-redux';
import ReactDOM from 'react-dom';
import { List, Tag, Button } from 'antd';
import store from '../../../../redux/store';
import { MessageOutlined, LikeOutlined, StarOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import Amplify, { Storage } from 'aws-amplify';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'

import RegisterMembership from './RegisterMembership'


import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const EditMembership = (props) => {

    // console.log(props)

    return (
        <Provider store={store}>
            <h1>Edit Membership</h1>
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
            <div>
            <RegisterMembership membership={props.location.state}/>
            </div>
        </Provider>
    )
}

export default EditMembership