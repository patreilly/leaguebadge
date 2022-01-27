import React from 'react';
// import '../../../App.css';
import './AuthStateApp.css';
import Amplify from 'aws-amplify';
import { AmplifyAuthenticator, AmplifySignUp, AmplifySignIn, AmplifySignOut } from '@aws-amplify/ui-react';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';

import awsconfig from '../../../aws-exports';

import { withRouter } from "react-router";

Amplify.configure(awsconfig);

const AuthStateApp = () => {
    const [authState, setAuthState] = React.useState();
    const [user, setUser] = React.useState();

    React.useEffect(() => {
        return onAuthUIStateChange((nextAuthState, authData) => {
            setAuthState(nextAuthState);
            setUser(authData)
        });
    }, []);

  return authState === AuthState.SignedIn && user ? (
    //   console.log("we made it.")
    // this.props.history.push('/')
      
        <div className="App">
            <Provider store={store}>
            <ThemeSwitcherProvider themeMap={themes} defaultTheme={THEME_CONFIG.currentTheme} insertionPoint="styles-insertion-point">
                <Router>
                <Switch>
                    <Route path="/" component={Views}/>
                </Switch>
                </Router>
            </ThemeSwitcherProvider>
            </Provider>
            <AmplifySignOut />
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

export default AuthStateApp;