import React, { useEffect } from 'react'
import { Provider, connect } from 'react-redux';
import ReactDOM from 'react-dom';
import { List, Tag, Button } from 'antd';
import store from '../../../../redux/store';
import { MessageOutlined, LikeOutlined, StarOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import Amplify, { Storage } from 'aws-amplify';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../../configs/AppConfig'

import RegisterProgram from './RegisterProgram'


import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const EditProgram = (props) => {

    return (
        <Provider store={store}>
            <h1>Edit Program</h1>
            <p>Programs serve as the gateway to your league. Without a program, no one can buy a membership and join your league.</p>
            <p>You may only even have one program, and that is ok!</p>
            <p>If you're looking to manage details about your membership settings such as membership card design, duration of membership, or price,
                those settings can be found under memberships.</p>
            <div>
            <RegisterProgram/>
            </div>
        </Provider>
    )
}

export default EditProgram