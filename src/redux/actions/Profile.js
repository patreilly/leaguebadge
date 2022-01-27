import {
  LOGIN_SUCCEEDED,
  INIT_PROFILE,
  PROFILE_UPDATED,
  GET_PROFILE,
  POST_PROFILE
  // AUTH_SUCCEEDED
} from '../constants/Profile';

// export const updateProfile = (profileData) => {
//   return {
//     type: UPDT_PROFILE,
//     payload: profileData
//   };
// };

export const initProfile = (username) => {
  // console.log('payload received from loginSucceeded saga',username)
  return {
    type: INIT_PROFILE,
    payload: username
  };
};

export const getProfile = (data) => {
  return {
    type: GET_PROFILE,
    payload: data
  }
}

export const updateProfile = (data) => {
  return {
    type: PROFILE_UPDATED,
    payload: data
  };
};

export const postProfile = (data) => {
  return {
    type: POST_PROFILE,
    payload: data
  };
};

export const loginSucceeded = (userData) => {
  return {
    type: LOGIN_SUCCEEDED,
    payload: userData
  }
}


// export const signIn = (user) => {
//   return {
//     type: SIGNIN,
//     payload: user
//   }
// };

// export const authenticated = (token) => {
//   return {
//     type: AUTHENTICATED,
//     token
//   }
// };

// export const signOut = () => {
//   return {
//     type: SIGNOUT
//   };
// };

// export const signOutSuccess = () => {
//   return {
//     type: SIGNOUT_SUCCESS,
//   }
// };


// export const signUpSuccess = (token) => {
//   return {
//     type: SIGNUP_SUCCESS,
//     token
//   };
// };

// export const signInWithGoogle = () => {
//   return {
//     type: SIGNIN_WITH_GOOGLE
//   };
// };

// export const signInWithGoogleAuthenticated = (token) => {
//   return {
//     type: SIGNIN_WITH_GOOGLE_AUTHENTICATED,
//     token
//   };
// };

// export const signInWithFacebook = () => {
//   return {
//     type: SIGNIN_WITH_FACEBOOK
//   };
// };

// export const signInWithFacebookAuthenticated = (token) => {
//   return {
//     type: SIGNIN_WITH_FACEBOOK_AUTHENTICATED,
//     token
//   };
// };

// export const showAuthMessage = (message) => {
//   return {
//     type: SHOW_AUTH_MESSAGE,
//     message
//   };
// };

// export const hideAuthMessage = () => {
//   return {
//     type: HIDE_AUTH_MESSAGE,
//   };
// };

// export const showLoading = () => {
//   return {
//     type: SHOW_LOADING,
//   };
// };
