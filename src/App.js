import React from 'react';
// import {MenuContent} from './components/layout-components';
import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router } from 'react-router-dom';
import Views from './views';
import { Route, Switch } from 'react-router-dom';
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import { THEME_CONFIG } from './configs/AppConfig';

import './views/auth-views/components/AuthStateApp.css';
import Amplify, {Auth } from 'aws-amplify';
import { AmplifyAuthenticator, AmplifySignUp, AmplifySignIn } from '@aws-amplify/ui-react';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import awsconfig from './aws-exports';

const themes = {
  dark: `${process.env.PUBLIC_URL}/css/dark-theme.css`,
  // light: `${process.env.PUBLIC_URL}/css/light-theme.css`,
};

Amplify.configure(awsconfig);


function App() {
  const [authState, setAuthState] = React.useState();
  const [user, setUser] = React.useState();
  const [loggedIn, setLoggedIn] = React.useState(false);

  React.useEffect(() => {
      return onAuthUIStateChange((nextAuthState, authData) => {
          setAuthState(nextAuthState);
          // setUser(authData);
          Auth.currentAuthenticatedUser({
            bypassCache: true  // Optional, By default is false. If set to true, this call will send a request to Cognito to get the latest user data
          }).then(user => setUser(user))
          .catch(err => console.log(err));
      });
  }, []);

  React.useEffect(() => {
    if(authState === AuthState.SignedIn && user){
      setLoggedIn(true)
    }
    else {
      setLoggedIn(false)
    }
  }, [user, authState])


  // return authState === AuthState.SignedIn && user ? (
    return loggedIn ? (
        <div className="App">
            <Provider store={store}>
              <ThemeSwitcherProvider themeMap={themes} defaultTheme={THEME_CONFIG.currentTheme} insertionPoint="styles-insertion-point">
                  <Router>
                  <Switch>
                      {/* <Route path="/" component={Views}/> */}
                      <Route path="/" render={(props) =>(
                        <Views {...props} userInfo={user}/>
                      )}/>
                  </Switch>
                  </Router>
              </ThemeSwitcherProvider>
            </Provider>
        </div>
        
    ) : (
        <AmplifyAuthenticator usernameAlias="email">
        <AmplifySignUp
          slot="sign-up"
          usernameAlias="email"
          formFields={[
            {
              type: "email",
              label: "Email",
              placeholder: "name@email.com",
              required: true,
            },
            {
              type: "password",
              label: "Password",
              required: true,
            }
          ]}
        />
        <AmplifySignIn slot="sign-in" usernameAlias="email" headerText="Sign in to your League Badge account"/>
      </AmplifyAuthenticator>
  );
}

export default App;

