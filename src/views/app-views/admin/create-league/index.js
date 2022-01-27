import React, { useEffect } from 'react'
import { Provider, connect } from 'react-redux';

import { List, Avatar, Button, message, Upload} from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import store from '../../../../redux/store';
import Flex from 'components/shared-components/Flex'
import RegisterLeague from './RegisterLeague';

import Amplify, { Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

const CreateLeague = (props) => {

	return (
        <Provider store={store}>
            <h1>League Registration</h1>
            <p>Register your league with League Badge so your programs can be made available to the public</p>
            <p>By registering a league your name and email address are automatically designated administrator of this league.</p>
            <div>
            <RegisterLeague/>
            </div>
        </Provider>

	)
}

export default CreateLeague
