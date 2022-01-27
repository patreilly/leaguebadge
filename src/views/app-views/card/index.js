import React, { useEffect } from 'react'
import {useHistory, useParams} from 'react-router-dom';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';

import { Table, Divider, Tag, List, Button, Modal, Card } from 'antd';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
import ReactDOM from 'react-dom';
import { Link, Router, useLocation } from 'react-router-dom';
import Amplify, { Storage } from 'aws-amplify';
import awsconfig from '../../../aws-exports';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../configs/AppConfig'


const PlayerCard = (props) => {
    const [localProfileState, setLocalProfileState] = React.useState(props.profile)
    const [avatarDisplayState, setAvatarDisplayState] = React.useState();
    const urlParams = useParams();
    const memberid = urlParams.memberid;
    console.log(props)

    React.useEffect(() => {
		// if(!avatarDisplayState){
		// 	setAvatarDisplayState({displayAvatar: ''})
		// }
        console.log('processing')
        if(props.profile.avatarUrl){
            console.log('found avatar url')
            setAvatarDisplayState({displayAvatar: props.profile.avatarUrl})
        }
		else if(props.profile.avatar){
			downloadAvatarFromS3(props.profile.avatar);
		}
		setLocalProfileState(props.profile)
    }, [props.profile])


    React.useEffect(() => {
        console.log(avatarDisplayState)
    }, [avatarDisplayState])


	const downloadAvatarFromS3 = async options => {
		try {
			const result = await Storage.get(
				options.s3FileName, 
				{
					level: 'private',
					// download: true
				})
			// console.log(result)
            .then(
                setAvatarDisplayState({displayAvatar: result})
            )
			

			return;
			
		}
		catch(err){
			console.log(err)
		}
	}

    return (
        <>
            <h1>
                The Greater Seattle Soccer League
            </h1>
            <h2>
                Annual Player Pass
            </h2>
            <div>
                <Avatar 
                    shape="square"
                    size={{ xs: 200, sm: 250, md: 300, lg: 350, xl: 350, xxl: 350 }}
                    icon={<UserOutlined/>}
                    src={avatarDisplayState.displayAvatar ? avatarDisplayState.displayAvatar : ''}
                />
            </div>
            <h4>{`Member ID: ${memberid}`}</h4>

            <Button>Full Screen</Button>
        </>
    )
}


const mapStateToProps = state => {

	const {profile} = state
	return {
		profile: profile
	}

}

const mapDispatchToProps = {
	
  }

export default connect(mapStateToProps, mapDispatchToProps)(PlayerCard)