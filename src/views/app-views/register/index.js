import React, { useEffect } from 'react'
import { Provider, connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
import ReactDOM from 'react-dom';
import { List, Tag, Modal } from 'antd';
import store from '../../../redux/store';
import { MessageOutlined, LikeOutlined, StarOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { Link, useLocation, useHistory } from 'react-router-dom';
import Amplify, { Storage, API } from 'aws-amplify';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../configs/AppConfig'
import RegisterMember from './RegisterMember'

import awsconfig from '../../../aws-exports';
Amplify.configure(awsconfig);
const apiName = 'playercardsapi';

const Message = ({ message }) => (
    <section>
      <p>{message}</p>
    </section>
  );



const CreateMember = (props) => {
  let history = useHistory();
  const [visible, setVisible] = React.useState(false);
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [modalText, setModalText] = React.useState('Content of the modal');
  const [modalTitle, setModalTitle] = React.useState('')
  const [isRenewal, setIsRenewal] = React.useState(false)
  const [membershipId, setMembershipId] = React.useState(null)
  const [currentMembership, setCurrentMembership] = React.useState(null)

  const getProfile = props.getProfile
  const userId = props.profile.id

  const showModal = () => {
    setVisible(true);
  };

  const getMembershipInfo = (membershipId) => {

  }

  const checkMembership = (membershipId, userId) => {
    for (let i = 0; i < 10; i++) {
      console.log('refreshing user profile...')
      getProfile(userId)
      setTimeout(function timer() {
        console.log('Waiting before next retry');
      }, i * 3000);
    }
  }

  const getMembershipIds = (memberships) => {
    let membershipsArray = []
    if(memberships){
      for (let index = 0; index < memberships.length; index++) {
        membershipsArray.push(memberships[index].membershipid)
      }
    }
    return membershipsArray
  }


  const handleOk = () => {
    // setModalText('The modal will be closed after two seconds');
    // setConfirmLoading(true);
    // setTimeout(() => {
    //   setVisible(false);
    //   setConfirmLoading(false);
    // }, 2000);
    setConfirmLoading(false);
  };

  const handleCancel = () => {
    console.log('Clicked cancel button');
    setVisible(false);
    setConfirmLoading(false);
  };

  // console.log(props)
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
      // Check to see if this is a redirect back from Checkout
      const query = new URLSearchParams(window.location.search);
      const membershipId = window.location.pathname.split('/').slice(-1)[0]
      console.log('membershipId', membershipId)
      setMembershipId(membershipId)
      console.log('query length', query.keys().length)
      if (query.get("success")) {
        getProfile(userId)
        setModalTitle('Payment Success!');
        setModalText('Do not leave this page. Please wait while we create your membership...');
        setConfirmLoading(true);
        showModal();
      }
  
      if (query.get("cancelled")) {
        setMessage(
          "Order cancelled -- continue to shop around and checkout when you're ready."
        );
      }
    }, []);


  React.useEffect(() => {
    if(props.location.state){
      setCurrentMembership(props.location.state)
    }
  }, [props.location.state])


  React.useEffect(() => {
    console.log('membership list', props.profile.memberships)
     // Check to see if this is a redirect back from Checkout
    const query = new URLSearchParams(window.location.search);
    // const membershipId = window.location.pathname.split('/').slice(-1)[0]
    if (query.get("success")) {
      let currentMemberships = getMembershipIds(props.profile.memberships)
      if(membershipId){
        console.log('refreshing user profile...')
        let membershipFound = currentMemberships.includes(membershipId)
        let retries = 5

        if(membershipFound){
          console.log('membership found')
          history.push(`${APP_PREFIX_PATH}/memberships`)
        }
        else {
          while (!membershipFound && retries > 0){
            setTimeout(function timer() {
              // console.log('refreshing user profile AGAIN...')
              getProfile(userId)
              currentMemberships = getMembershipIds(props.profile.memberships)
              membershipFound = currentMemberships.includes(membershipId)
              if(membershipFound){
                // console.log('membership found')
                history.push(`${APP_PREFIX_PATH}/memberships`)
              }
            }, 2000);
            retries--
          }
        }
      }
    }
  }, [props.profile])

  return currentMembership ? (
      <Provider store={store}>
          <h1>{currentMembership.league_info.name}</h1>
          <div>
          <RegisterMember program={currentMembership.program_info}/>
          </div>
      </Provider>
  ) : (
      // <Message message={message} />
      <Modal
        title={modalTitle}
        bodyStyle={{'text-align': 'center'}}
        style={{'text-align': 'center'}}
        visible={visible}
        // onOk={handleOk}
        // confirmLoading={confirmLoading}
        // onCancel={handleCancel}
        width={500}
        centered
        closable={false}
        footer={null}
      >
        <p
          style={{'text-align': 'center'}}
        >
          {modalText}
          </p>
        <LoadingOutlined
          style={{'font-size': '5em'}}
        />
      </Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateMember)