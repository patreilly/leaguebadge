import React, { lazy, Suspense } from "react";
import { Switch, Route} from "react-router-dom";
// import { connect } from "react-redux";
import Loading from 'components/shared-components/Loading';
import { APP_PREFIX_PATH } from 'configs/AppConfig'
import EditProfile from '../app-views/pages/setting/EditProfile'
import ChangePassword from '../app-views/pages/setting/ChangePassword'
import CreateProgram from './admin/create-program'
import CreateMembership from './admin/create-membership'
import CreateLeague from './admin/create-league'

import EditProgram from './admin/edit-program'
import EditMembership from './admin/edit-membership'
import EditLeague from './admin/edit-league'

import Memberships from './memberships'
import JoinLeague from './joinleague'

export const AppViews = (props) => {
  // console.log('props', props)
  const { isLeagueAdmin } = props;

  if(isLeagueAdmin){
    return (
      <Suspense fallback={<Loading cover="content"/>}>
        <Switch>
          <Route path={`${APP_PREFIX_PATH}/`} exact component={lazy(() => import(`./home`))} />
          <Route path={`${APP_PREFIX_PATH}/memberships`} component={Memberships} />
          <Route path={`${APP_PREFIX_PATH}/cards`} component={lazy(() => import(`./cards`))} />
          <Route path={`${APP_PREFIX_PATH}/card/:memberid`} component={lazy(() => import(`./card`))} />
          <Route path={`${APP_PREFIX_PATH}/joinleague`} component={JoinLeague} />
          <Route path={`${APP_PREFIX_PATH}/register/:programid`} component={lazy(() => import(`./register`))} />
          <Route path={`${APP_PREFIX_PATH}/membership/:membershipid`} component={lazy(() => import(`./register`))} />
          <Route path={`${APP_PREFIX_PATH}/admin/leagues`} component={lazy(() => import(`./admin/leagues`))} />
          <Route path={`${APP_PREFIX_PATH}/admin/create-league`} component={CreateLeague} />
          <Route path={`${APP_PREFIX_PATH}/admin/edit-league/:leagueid`} component={EditLeague} />
          <Route path={`${APP_PREFIX_PATH}/admin/memberships`} component={lazy(() => import(`./admin/memberships`))} />
          <Route path={`${APP_PREFIX_PATH}/admin/create-membership`} component={CreateMembership} />
          <Route path={`${APP_PREFIX_PATH}/admin/edit-membership/:membershipid`} component={EditMembership} />
          <Route path={`${APP_PREFIX_PATH}/admin/programs`} component={lazy(() => import(`./admin/programs`))} />
          <Route path={`${APP_PREFIX_PATH}/admin/edit-program/:programid`} component={EditProgram} />
          <Route path={`${APP_PREFIX_PATH}/admin/create-program`} component={CreateProgram} />
          <Route path={`${APP_PREFIX_PATH}/admin/players`} component={lazy(() => import(`./admin/players`))} />
          <Route path={`${APP_PREFIX_PATH}/admin`} component={lazy(() => import(`./admin`))} />
          <Route path={`${APP_PREFIX_PATH}/pages/setting/edit-profile`} component={EditProfile} />
          <Route path={`${APP_PREFIX_PATH}/pages/setting/change-password`} component={ChangePassword} />
          <Route path={`${APP_PREFIX_PATH}/home`} component={lazy(() => import(`./home`))} />
          {/* <Redirect from={`${APP_PREFIX_PATH}`} to={`${APP_PREFIX_PATH}/home`} /> */}
        </Switch>
        
      </Suspense>
    )
  } else {
    return (
      <Suspense fallback={<Loading cover="content"/>}>
      <Switch>
        <Route path={`${APP_PREFIX_PATH}/`} exact component={lazy(() => import(`./home`))} />
        <Route path={`${APP_PREFIX_PATH}/memberships`} component={Memberships} />
        <Route path={`${APP_PREFIX_PATH}/cards`} component={lazy(() => import(`./cards`))} />
        <Route path={`${APP_PREFIX_PATH}/joinleague`} component={JoinLeague} />
        <Route path={`${APP_PREFIX_PATH}/register/:programid`} component={lazy(() => import(`./register`))} />
        <Route path={`${APP_PREFIX_PATH}/pages/setting/edit-profile`} component={EditProfile} />
        <Route path={`${APP_PREFIX_PATH}/pages/setting/change-password`} component={ChangePassword} />
        <Route path={`${APP_PREFIX_PATH}/membership/:membershipid`} component={lazy(() => import(`./register`))} />
        <Route path={`${APP_PREFIX_PATH}/home`} component={lazy(() => import(`./home`))} />
        {/* <Redirect from={`${APP_PREFIX_PATH}`} to={`${APP_PREFIX_PATH}/home`} /> */}
      </Switch>
    </Suspense>
    )
  }
}


// const mapStateToProps = ({ theme, auth }, props) => {
//   console.log(props)
//   const { locale, direction } =  theme;
//   const { token } = auth;
//   return { locale, token, direction}
// };


export default React.memo(AppViews);
// export default withRouter(connect(mapStateToProps)(AppViews));