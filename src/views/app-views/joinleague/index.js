import React from 'react'
import { EllipsisOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { Table, Divider, Tag, List, Button, Modal, Card, Anchor } from 'antd';
import { connect } from 'react-redux';
import { getProfile } from 'redux/actions/Profile';
// import ReactDOM from 'react-dom';
import { Link, useHistory  } from 'react-router-dom';
import Amplify, { API } from 'aws-amplify';
import awsconfig from '../../../aws-exports';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../configs/AppConfig'
import moment from 'moment';
// import { waitForElementToBeRemoved } from '@testing-library/dom';

Amplify.configure(awsconfig);
const { Meta } = Card;
const apiName = 'playercardsapi';
const defaultLogo = 'https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png'


const JoinLeague = (props) => {
	const [membershipsState, setMembershipsState] = React.useState();
	const [loadingState, setLoadingState] = React.useState({loading: true})
	const [currentModalMembership, setCurrentModalMembership] = React.useState({visible: false, membershipInfo: null})
	const [requiredFieldsWarningModal, setRequiredFieldsWarningModal] = React.useState({visible: false, missingFields: null, leagueName: null, programName: null})
	const [existingMembershipModal, setExistingMembershipModal] = React.useState({visible: false})
	const [currentMemberships, setCurrentMemberships] = React.useState([])
	let history = useHistory();
	
	React.useEffect(() => {
		// console.log('making get request')
        const path = `/memberships`;
        const myInit = {
          headers: {},
          response: true,
        }
		API
		.get(apiName, path, myInit)
		.then((response) => {
			// console.log(response)
			setMembershipsState(response.data)
		})


	}, [])


	React.useEffect(() => {
		
		if(props.profile.memberships){
			let membershipArray = []
			for (var i=0;i<props.profile.memberships.length;i++){
				// console.log('membership id', props.profile.memberships[i].id)
				membershipArray.push(props.profile.memberships[i].membershipid)
			}
			setCurrentMemberships(membershipArray)
		}
		getProfile(props.profile.id)
	}, [props.profile])

	const onOpenLeagueInfoModal = i => {
		setCurrentModalMembership({
		  visible: true,
		//   selectMembership: i, // When a post is clicked, mark it as selected
		  membershipInfo: i
		});
	  };

	const onCloseLeagueInfoModal = () => {
		setCurrentModalMembership({
			visible: false,
			membershipInfo: null 
		  });
	  };

	const onCloseMissingFieldsModal = () => {
		setRequiredFieldsWarningModal({
			visible: false, 
			missingFields: null, 
			leagueName: null, 
			programName: null
		});
	};

	const onCloseExistingMembershipModal = () => {
		setExistingMembershipModal({
			visible: false
		});
	};

	const checkProfileFields = (fields) => {
		// console.log('Profile data', props.profile)

		const nonBlankProfileFields = []
		for (let field in props.profile) {
			let element = props.profile[field];
			// console.log('Checking field', field)
			if(element !== "" && element !== null){
				nonBlankProfileFields.push(field)
			}
		}

		// console.log('nonBlankProfileFields', nonBlankProfileFields)
		// console.log('required fields', fields)

		let missingFields = []
		// console.log(fields)
		for (let index = 0; index < fields.length; index++) {
			if(nonBlankProfileFields.indexOf(fields[index]) == -1){
				missingFields.push(fields[index])
			}
		}

		return missingFields
	}

	const handleJoinLeagueClick = (data) => {
		const membershipId = data.id
		const missingFields = checkProfileFields(data.program_info.requiredFields)

		if(currentMemberships.includes(membershipId)){
			setExistingMembershipModal({visible: true})
		}
		else if (missingFields.length > 0){
			setRequiredFieldsWarningModal({
				visible: true,
				missingFields: missingFields,
				leagueName: data.league_info.name,
				programName: data.program_info.name
			  });
		}
		else {
			history.push({
				pathname: `${APP_PREFIX_PATH}/register/${membershipId}`,
				state: data
			})
		}
	}

	const renderLeagueInfoModal = () => {
		// Check to see if there's a selected post. If so, render it.
		// if (currentModalMembership.selectMembership !== null) {
		if (currentModalMembership.membershipInfo !== null ) {
			let membershipDescription = currentModalMembership.membershipInfo.membershipDesc ? currentModalMembership.membershipInfo.membershipDesc : null
			let leagueDescription = currentModalMembership.membershipInfo.league_info.leagueDesc ? currentModalMembership.membershipInfo.league_info.leagueDesc : null
			let priceAmt = currentModalMembership.membershipInfo.priceAmount ? currentModalMembership.membershipInfo.priceAmount : null
			let priceCurrency = currentModalMembership.membershipInfo.priceCurrency ? currentModalMembership.membershipInfo.priceCurrency : null
			return (
			<div>
				<h4>{currentModalMembership.membershipInfo.name}</h4>
				<h5>Description:</h5>
				<p>{membershipDescription ? membershipDescription : 'No description provided'}</p>
				<h5>Price:</h5>
				<p>{priceAmt ? `${priceAmt} (${priceCurrency})` : 'Free'}</p>


				<h4>{`More on the league:`}</h4>
				<p>{leagueDescription ? leagueDescription : 'No description provided'}</p>
			</div>
			);
		}
	  }

	  const canRenew = (membership) => {
		let enabled = false
		if(props.profile.memberships){
			for (var i=0;i<props.profile.memberships.length;i++){
				if(props.profile.memberships[i].membershipid == membership.id){
					const player_membership = props.profile.memberships[i]
					const expirationDate = moment(player_membership.expiration_date)
					const earliestRenewalDateTime = expirationDate.subtract(membership.renewalWindowAmt, membership.renewalWindowBasis)
					// console.log('earliestRenewalDateTime', earliestRenewalDateTime.format('MM/DD/YYYY hh:mm a'))
					if(moment() > earliestRenewalDateTime){
						enabled = true
					}
				}
			}
		}

		return enabled
	}

	const renderMissingFieldsModal = () => {
		// console.log(requiredFieldsWarningModal)
		if(requiredFieldsWarningModal.missingFields){
			return (
				<div>
					<p>{`The ${requiredFieldsWarningModal.programName} program at ${requiredFieldsWarningModal.leagueName} requires the following profile information before joining:`}</p>
					{
					requiredFieldsWarningModal.missingFields.map(field => (
						<p>{field}</p>
					))
					}
					<p>Click <Link to={'pages/setting/edit-profile'}>HERE</Link> to edit your profile</p>
				</div>
				);
		}

	}


	const renderExistingMembershipModal = () => {
		return (
			<div>
				<p>You already own this membership.</p> 
				<p>Visit <Link to={'memberships'}>your memberships</Link> to view.</p>
			</div>
			);
	}

	return (
		<div>
			<h1>Available Leagues</h1>
			<br/>
			<List
				grid={{
					gutter: 16,
				}}
				dataSource={membershipsState}
				// loading={loadingState.loading}
				renderItem={item => (
					<List.Item>
						<div key={item.id}>
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
							<Button type="primary" size={'Large'} onClick={() => handleJoinLeagueClick(item)} disabled={currentMemberships.includes(item.id)}>JOIN</Button>,
							<Button type="text" size={'Large'} onClick={() => onOpenLeagueInfoModal(item)} icon={<InfoCircleOutlined/>}></Button>,
							// <EllipsisOutlined key="ellipsis" />,
							<Button type="primary" size={'Large'} onClick={() => handleJoinLeagueClick(item)} disabled={!canRenew(item)}>RENEW</Button>,
							]}
							>
								<Meta
								title={item.name}
								description={item.membershipDesc}
								/>
						</Card>
						</div>
					</List.Item>
				)}
			/>
			<Modal 
				visible={currentModalMembership.visible}
				title={currentModalMembership.membershipInfo ? `${currentModalMembership.membershipInfo.league_info.name}` : ''}
				onOk={onCloseLeagueInfoModal}
				onCancel={onCloseLeagueInfoModal}
				onClose={onCloseLeagueInfoModal}
				>
				<div>{renderLeagueInfoModal(currentModalMembership)}</div>
			</Modal>
			<Modal 
				visible={requiredFieldsWarningModal.visible}
				title="We'll need some more information"
				onOk={onCloseMissingFieldsModal}
				onCancel={onCloseMissingFieldsModal}
				onClose={onCloseMissingFieldsModal}
				>
				<div>{renderMissingFieldsModal(requiredFieldsWarningModal)}</div>
			</Modal>
			<Modal 
				visible={existingMembershipModal.visible}
				title="Existing membership"
				onOk={onCloseExistingMembershipModal}
				onCancel={onCloseExistingMembershipModal}
				onClose={onCloseExistingMembershipModal}
				>
				<div>{renderExistingMembershipModal()}</div>
			</Modal>
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

export default connect(mapStateToProps, mapDispatchToProps)(JoinLeague)
