import React from 'react'
// import { List } from 'react-virtualized'
import { Table, Tooltip, Tag, List, Button, Modal, Card } from 'antd';
// import { Link } from 'react-router-dom';
import { CLOUDFRONT_URL, APP_PREFIX_PATH } from '../../../configs/AppConfig'
import { EyeOutlined, InfoCircleOutlined, EllipsisOutlined, UserOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
// import Amplify, { Storage } from 'aws-amplify';
import { Avatar } from 'antd';
import { getProfile } from 'redux/actions/Profile';
import moment from 'moment';
import './pulse.css'

const { Meta } = Card;
const modalDurationSeconds = 60;

const Cards = (props) => {

    const [avatarDisplayState, setAvatarDisplayState] = React.useState('');
	const [webCardsList, setWebCardsList] = React.useState([])
	const [cardVisibleState, setCardVisibleState] = React.useState(false)
	const [currentMembershipCard, setCurrentMembershipCard] = React.useState()
	const [secondsToGoLocal, setSecondsToGoLocal] = React.useState(modalDurationSeconds) 
	const [modalInterval, setModalInterval] = React.useState()
	const [modalTimeout, setModalTimeout] = React.useState()

	React.useEffect(() => {

		if(props.profile.memberships){
			buildWebCardList(props.profile.memberships)
		}

		if(props.profile.avatarUrl){
			setAvatarDisplayState(`${CLOUDFRONT_URL}${props.profile.avatarUrl}`)
		}
	}, [props.profile])


	React.useEffect(() => {
		// console.log('card visible state', cardVisibleState)
		if(cardVisibleState){
			modalTimer()
		}
		else{
			setSecondsToGoLocal(modalDurationSeconds)
		}
		
	}, [cardVisibleState])


    const modalTimer = () => {
        // console.log('starting timer...')

		const timeOut = setTimeout(() => {
			clearInterval(interval)
			clearTimeout(timeOut)
			setModalInterval(null)
			setModalTimeout(null)
			setCardVisibleState(false)
			// Modal.destroyAll();
		}, secondsToGoLocal * 1000 )

		let secondsToGo = secondsToGoLocal
		const interval = setInterval(() => {
			secondsToGo -= 1
			setSecondsToGoLocal(secondsToGo)
		}, 1000);

		setModalInterval(interval)
		setModalTimeout(timeOut)
    }


	const calculateLeaguePlayerAge = (birthMonth, birthDay, birthYear) => {
		const birthDate = moment(`${birthYear}-${birthMonth}-${birthDay}`)
		const endOfYear = moment().endOf('year')
		const ageThisYear = endOfYear.diff(birthDate, 'years')
		let leagueAge;
		if(ageThisYear >= 65){
			leagueAge='O-65'
		}
		else if(ageThisYear >= 55){
			leagueAge='O-55'
		}
		else if(ageThisYear >= 50){
			leagueAge='O-50'
		}
		else if(ageThisYear >= 40){
			leagueAge='O-40'
		}
		else if(ageThisYear >= 30){
			leagueAge='O-30'
		}
		else {
			leagueAge='Open'
		}

		return leagueAge
		
	}

	const getMemberStatusColor = status => {
		let tagColor = 'yellow'
		switch(status) {
			case 'PENDING':
				tagColor = 'yellow';
				break;
			case 'ELIGIBLE':
				tagColor = 'green';
				break;
			case 'SUSPENDED':
				tagColor = 'red';
				break;
			default:
				tagColor = 'yellow'

		}
		return tagColor
	}

	const buildWebCardList = (memberships) => {
		let cardList = []
		for (let m = 0; m < memberships.length; m++) {
			const membership = memberships[m];
			// console.log('membership', membership)
			if(membership.selected_cards){
				for (let c = 0; c < membership.selected_cards.length; c++) {
					const cardType = membership.selected_cards[c];
					if(cardType == 'web'){
						cardList.push(membership)
					}
				}
			}
		}
		setWebCardsList(cardList)
	}


	const showCardModal = (memberId) => {
		// console.log(memberId)
		props.getProfile(props.profile.id)
		let membershipDetails;
		for (let m = 0; m < props.profile.memberships.length; m++) {
			if(props.profile.memberships[m].id == memberId){
				membershipDetails = props.profile.memberships[m]
			}
		}
		setCurrentMembershipCard(membershipDetails)
		setCardVisibleState(true)
		// console.log('card visible state', cardVisibleState)
	}


	const closeCardModal = () => {
		// console.log('clear modal clicked')
		setCardVisibleState(false)
		Modal.destroyAll();
		
		setCurrentMembershipCard(null)
		clearInterval(modalInterval)
		clearTimeout(modalTimeout)
		setModalInterval(null)
		setModalTimeout(null)
	}

	const onStatusTagClick = (data) => {
		console.log(data)

	}
	
	return (
		<div>
			<h1>Your Player Cards</h1>

			<List>
				{
					webCardsList.map((membership) => 
					<List.Item key={membership.id}>
						<Card
						headStyle={{fontSize: 24}}
						style={{ width: 300, textAlign: 'center' }}
						title={
								<div
								style={{
									whiteSpace: 'normal', 
									lineHeight: '1.25em'
								}}
								>
									{membership.membership_details.league_info.name}
								</div>
							}
						cover={
							<div
							style={{textAlign: 'center', justifyContent: 'center', paddingTop: 20}}
							>
								<img
									alt="leagueLogo"
									src={membership.membership_details.league_info.logo_url ? `${CLOUDFRONT_URL}${membership.membership_details.league_info.logo_url}` : ''}
									style={{width: 200}}
								/>
							</div>
							}
						actions={[
							<Tooltip
							title="Click to show card"
							arrowPointAtCenter={true}
							placement="bottom"
							>
								<EyeOutlined onClick={() => showCardModal(membership.id)} key="show" />
							</Tooltip>,
							<InfoCircleOutlined key="info" />,
							<Tooltip
							title={membership.status_desc ? membership.status_desc : ''}
							arrowPointAtCenter={true}
							color={getMemberStatusColor(membership.status)}
							placement="bottom"
							>
								<Tag 
								style={{ 
									fontWeight: 'bold', 
									verticalAlign: 'center'
								}} 
								color={getMemberStatusColor(membership.status)}
								// onClick={() => onStatusTagClick(membership.status_desc)}
								>
									{membership.status}
								</Tag>
							</Tooltip>

							]}
						>
							<Meta
								title={
									<div
									style={{
										whiteSpace: 'normal', 
										lineHeight: '1.25em'
									}}
									>
										{membership.membership_details.membership_info.name.toUpperCase()}
									</div>
									}
								description={
									<div
									style={{color: 'rgb(214, 215, 220)'}}
									>
										{
										membership.membership_details.membership_info.membershipDesc
										}
									</div>}
							/>
							
						</Card>
					</List.Item>
					)
				}
			</List>
			<>
				{
					currentMembershipCard ?
					<Modal
					// title="Player Card"
					centered
					visible={cardVisibleState}
					onOk={(e) => {closeCardModal(e);}}
					onCancel={(e) => {closeCardModal(e);}}
					destroyOnClose={true}
					// confirmLoading={confirmLoading}
					bodyStyle={{
						height: '100%',
						width: '100%',
						justifyContent: 'center',
						alignItems: 'center',
						background: 'white',
						paddingBottom: '5px'
					}}
					// footer={[
					// 	<Button
					// 		type="primary"
					// 		onClick={() => closeCardModal()}
					// 		block={true}
					// 	>
					// 		OK
					// 	</Button>
					// ]}
					footer={null}
				>
						<div
							style={{
								justifyContent: 'center',
								alignItems: 'center',
								textAlign: 'center'
							}}>
							<div
							style={{
								// backgroundColor: 'blue',
								height: '50px',
								
							}}>
								<Tag style={{ fontSize: '300%', fontWeight: 'bold', verticalAlign: 'center', lineHeight: '1em' }} color={getMemberStatusColor(currentMembershipCard.status)}>{currentMembershipCard.status}</Tag>
							</div>
							<h2 style={{ color: 'black', lineHeight: '1em', textTransform: 'uppercase', marginBottom: '20px' }}>{currentMembershipCard.status_desc}</h2>
							<div
								style={{
									justifyContent: 'center',
									alignItems: 'center',
									verticalAlign: 'middle',
									display: 'flex',
									marginBottom: '10px'
								}}
							>
								<Avatar
									shape="square"
									size={{ xs: 200, sm: 250, md: 300, lg: 350, xl: 350, xxl: 350 }}
									icon={<UserOutlined />}
									src={avatarDisplayState}

								/>
							</div>
							<h1 style={{ color: 'black' }}>{`${props.profile.firstName} ${props.profile.lastName}`}</h1>
							{/* <h1 style={{ color: 'black', lineHeight: '1em' }}>{'The Most amazing first and last name you will ever see'}</h1> */}

							<div style={{
								textAlign: 'center',
								paddingBottom: '10px'
							}}>
								<h2 style={{ textAlign: 'center', color: 'black', lineHeight: '1em' }}>{`Age Group: ${calculateLeaguePlayerAge(props.profile.birthMonth, props.profile.birthDay, props.profile.birthYear)}`}</h2>
								<h2 style={{ textAlign: 'center', color: 'black', lineHeight: '1em' }}>{`Member ID: ${currentMembershipCard.id}`}</h2>
								<h2 style={{ textAlign: 'center', color: 'black', lineHeight: '1em' }}>{currentMembershipCard.membership_details.league_info.name}</h2>
							</div>
							<span
							>
								<img
								style={{width: '100px', height: '100px', display: 'block', marginLeft: 'auto', marginRight: 'auto', marginBottom: '20px'}}
								alt="leagueLogo"
								src={currentMembershipCard.membership_details.league_info.logo_url ? `${CLOUDFRONT_URL}${currentMembershipCard.membership_details.league_info.logo_url}` : ''}
								className="card-logo"
								/>
							</span>

							<div
							style={{
								paddingBottom: '10px'
							}}
							>
								<Button
								type="primary"
								// onClick={(e) => {closeCardModal(e);}}
								onClick={closeCardModal}
								block={true}
								>
									OK
								</Button>
							</div>
							<p style={{ 
								color: 'black', 
								textAlign: 'center', 
								// backgroundColor: '#E4E4E4'
							}}
								>
									{`Closing in ${secondsToGoLocal} seconds`}
								</p>


						</div>
				</Modal> :
				null
				}
			</>
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

export default connect(mapStateToProps, mapDispatchToProps)(Cards)
