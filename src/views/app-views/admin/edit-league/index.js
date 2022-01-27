import React, { } from 'react'
import { Provider } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Switch, Route} from "react-router-dom";
// import { List, Avatar, Button, message, Upload} from 'antd';
// import { PictureOutlined } from '@ant-design/icons';
import store from '../../../../redux/store';
// import Flex from 'components/shared-components/Flex'
import RegisterLeague from './RegisterLeague';
import { APP_PREFIX_PATH } from 'configs/AppConfig'
import Amplify, { Storage } from 'aws-amplify';
import awsconfig from '../../../../aws-exports';
Amplify.configure(awsconfig);

{/* <Switch>
  <Route path='/edit-league/:leagueid'>
    <EditLeague />
  </Route>
</Switch> */}

const EditLeague = (props) => {
	const urlParams = useParams();

	return (
        <Provider store={store}>
            <h1>Edit League</h1>
            {/* <p>Register your league with League Badge so your programs can be made available to the public</p>
            <p>By registering a league your name and email address are automatically designated administrator of this league.</p> */}
            <div>
            <RegisterLeague />
            </div>
        </Provider>

	)
}

export default EditLeague
