import React from "react";
import {useHistory} from 'react-router-dom';
import { Menu, Dropdown, Avatar } from "antd";
import { connect } from 'react-redux'
import store from '../../redux/store';
// import { Link } from 'react-router-dom';
import { 
  UserOutlined,
  LockOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import Icon from 'components/util-components/Icon';
import { signOut } from 'redux/actions/Auth';
// import { AmplifySignOut } from '@aws-amplify/ui-react';
import { APP_PREFIX_PATH, CLOUDFRONT_URL } from 'configs/AppConfig'
// import ReactApexChart from "react-apexcharts";
import Amplify, { Auth, Storage } from 'aws-amplify';

const menuItem = [
	{
      title: "Edit Profile",
      icon: UserOutlined ,
      path: `${APP_PREFIX_PATH}/pages/setting/edit-profile`,
  },
  {
    title: "Change Password",
    icon: LockOutlined ,
    path: `${APP_PREFIX_PATH}/pages/setting/change-password`,
  }
]

export const NavProfile = (props) => {
  const [localProfile, setLocalProfile] = React.useState(props.profile)
  const [avatarDisplayState, setAvatarDisplayState] = React.useState({displayAvatar: ''})

  let history = useHistory();
  
  React.useEffect(() => {
    // console.log(props)
    if(props.profile.avatarUrl){
      setAvatarDisplayState({displayAvatar: `${CLOUDFRONT_URL}${props.profile.avatarUrl}`})
    }else if (props.profile.avatar){
      downloadAvatarFromS3(props.profile.avatar); // sets avatar display too
    }else {
      setAvatarDisplayState({displayAvatar: ''})
    }
  },[props.profile.avatarUrl])

	const downloadAvatarFromS3 = async options => {
		try {
			const result = await Storage.get(
				options.s3FileName, 
				{
					level: 'private',
				})
			setAvatarDisplayState({displayAvatar: result})

			return;
			
		}
		catch(err){
			console.log(err)
		}
	}

  const signOutUser = () => {
    props.signOut()
    history.push(`/`)
    // ideally we redirect to a login page 
    // but we're using amplify react ui component to do that 
    // so we don't have an actual page to go to yet
    window.location.reload(); 
  }

  const profileMenu = (
    <div className="nav-profile nav-dropdown">
      <div className="nav-profile-header">
        <div className="d-flex">
          <Avatar size={45} src={avatarDisplayState.displayAvatar} icon={<UserOutlined />}/>
          <div className="pl-3">
            <h4 className="mb-0">{`${props.profile.firstName} ${props.profile.lastName}`}</h4>
            <span className="text-muted">{
              props.profile.city ?
            `${props.profile.city}, ${props.profile.state}`
            :
            ''
            }</span>
          </div>
        </div>
      </div>
      <div className="nav-profile-body">
        <Menu>
          {menuItem.map((el, i) => {
            return (
              <Menu.Item key={i}>
                <a href={el.path}>
                  <Icon className="mr-3" type={el.icon} />
                  <span className="font-weight-normal">{el.title}</span>
                </a>
              </Menu.Item>
            );
          })}
          {/* <Menu.Item key={menuItem.legth + 1} onClick={() => props.signOut()}> */}
          <Menu.Item key={menuItem.legth + 1} onClick={() => signOutUser()}>
            <span>
                <LogoutOutlined className="mr-3"/>
                <span className="font-weight-normal">Sign Out</span>
              </span>
          </Menu.Item>
        </Menu>
      </div>
    </div>
  );
  return (
    <Dropdown placement="bottomRight" overlay={profileMenu} trigger={["click"]}>
      <Menu className="d-flex align-item-center" mode="horizontal">
        <Menu.Item>
          <Avatar size={45} src={avatarDisplayState.displayAvatar} icon={<UserOutlined />}/>
        </Menu.Item>
      </Menu>
    </Dropdown>
  );
}

const mapStateToProps = state => {

	const {profile} = state
	return {
		profile: profile
	}

}

const mapDispatchToProps = {
  signOut
}


// export default connect(null, {signOut})(NavProfile)
export default connect(mapStateToProps, mapDispatchToProps)(NavProfile)
