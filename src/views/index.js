import React from "react";
import { Route, Switch, Redirect, withRouter } from "react-router-dom";
import { connect } from "react-redux";
// import store from '../redux/store';
import {loginSucceeded} from '../redux/actions/Profile'
import AppLayout from "layouts/app-layout";
import AuthLayout from 'layouts/auth-layout';
import AppLocale from "lang";
import { IntlProvider } from "react-intl";
import { ConfigProvider } from 'antd';
import { APP_PREFIX_PATH, AUTH_PREFIX_PATH } from 'configs/AppConfig'
import useBodyClass from 'hooks/useBodyClass';


export const Views = (props) => {
  const { locale, location, direction, userInfo } = props;

  const currentAppLocale = AppLocale[locale];
  useBodyClass(`dir-${direction}`);

  React.useEffect(() => {
    props.loginSucceeded(userInfo);
  },[]);

  return (
    <IntlProvider
      locale={currentAppLocale.locale}
      messages={currentAppLocale.messages}>
      <ConfigProvider locale={currentAppLocale.antd} direction={direction} >
        <Switch>
          <Route exact path="/" >
            <Redirect to={APP_PREFIX_PATH} />
          </Route>
          <Route path={AUTH_PREFIX_PATH} >
            <AuthLayout direction={direction} />
          </Route>
          {/* <Route path={APP_PREFIX_PATH} >
            <AppLayout direction={direction} location={location}/>
          </Route> */}
          <Route path={APP_PREFIX_PATH} render={(props) => (
            <AppLayout {...props} direction={direction} location={location}/>
          )}/>
        </Switch>
      </ConfigProvider>
    </IntlProvider>
  )
}



const mapStateToProps = ({ theme, auth, user, profile}) => {
  const { locale, direction } =  theme;
  const { token } = auth;
  // console.log(profile);
  return { locale, token, direction, user, profile}
};

const mapDispatchToProps = {
  loginSucceeded
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Views));

