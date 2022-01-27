import React from 'react';
import { connect } from 'react-redux';
import store from '../../redux/store';
import SideNav from 'components/layout-components/SideNav';
import TopNav from 'components/layout-components/TopNav';
import Loading from 'components/shared-components/Loading';
import MobileNav from 'components/layout-components/MobileNav'
import HeaderNav from 'components/layout-components/HeaderNav';
import PageHeader from 'components/layout-components/PageHeader';
import Footer from 'components/layout-components/Footer';
import AppViews from 'views/app-views';
import {
  Layout,
  Grid,
} from "antd";

import navigationConfig from "configs/NavigationConfig";
import Amplify, { Auth } from 'aws-amplify';
import { 
  SIDE_NAV_WIDTH, 
  SIDE_NAV_COLLAPSED_WIDTH,
  NAV_TYPE_SIDE,
  NAV_TYPE_TOP,
  DIR_RTL,
  DIR_LTR
} from 'constants/ThemeConstant';
import utils from 'utils';
import { useThemeSwitcher } from "react-css-theme-switcher";

const { Content } = Layout;
const { useBreakpoint } = Grid;


export const AppLayout = (props) => {
  const { navCollapsed, navType, location, direction } = props;
  const {profile} = store.getState();


  const [isLeagueAdmin, setIsLeagueAdmin] = React.useState(false)
  const currentRouteInfo = utils.getRouteInfo(navigationConfig,location.pathname)
  const screens = utils.getBreakPoint(useBreakpoint());
  const isMobile = !screens.includes('lg')
  const isNavSide = navType === NAV_TYPE_SIDE
  const isNavTop = navType === NAV_TYPE_TOP

  React.useEffect(() => {
    Auth.currentAuthenticatedUser({
      bypassCache: false
    })
    .then(user=> {
        let sessionData = user.signInUserSession.accessToken.payload;
        if('cognito:groups' in sessionData){
          for(let i = 0; i < sessionData['cognito:groups'].length; i++){
            if (sessionData['cognito:groups'][i] === 'leagueadmins'){
              setIsLeagueAdmin(true);
            }
          }
        }
    })
    .catch(err=>{
      console.log(err)
    })
  }, [])

  const getLayoutGutter = () => {
    if(isNavTop || isMobile) {
      return 0
    }
    return navCollapsed ? SIDE_NAV_COLLAPSED_WIDTH : SIDE_NAV_WIDTH
  }

  const { status } = useThemeSwitcher();

  if (status === 'loading') {
    return <Loading cover="page" />;
  }

  const getLayoutDirectionGutter = () => {
    if(direction === DIR_LTR) {
      return {paddingLeft: getLayoutGutter()}
    }  
    if(direction === DIR_RTL) {
      return {paddingRight: getLayoutGutter()}
    }
    return {paddingLeft: getLayoutGutter()}
  }

  return (
    <Layout>
      <HeaderNav isMobile={isMobile}/>
      {(isNavTop && !isMobile) ? <TopNav routeInfo={currentRouteInfo}/> : null}
      <Layout className="app-container">
        {(isNavSide && !isMobile) ? <SideNav routeInfo={currentRouteInfo} isLeagueAdmin={isLeagueAdmin}/> : null }
        <Layout className="app-layout" style={getLayoutDirectionGutter()}>
          <div className={`app-content ${isNavTop ? 'layout-top-nav' : ''}`}>
            <PageHeader display={currentRouteInfo?.breadcrumb} title={currentRouteInfo?.title} />
            <Content>
              <AppViews isLeagueAdmin={isLeagueAdmin}/>
            </Content>
          </div>
          <Footer />
        </Layout>
      </Layout>
      {isMobile && <MobileNav isLeagueAdmin={isLeagueAdmin}/>}
    </Layout>
  )
}

const mapStateToProps = ({ theme }) => {
  const { navCollapsed, navType, locale } =  theme;
  return { navCollapsed, navType, locale }
};



export default connect(mapStateToProps, null)(React.memo(AppLayout));