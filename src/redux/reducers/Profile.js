import {
    AUTH_SUCCEEDED,
    LOGIN_SUCCEEDED,
    INIT_PROFILE,
    PROFILE_UPDATED,
    GET_PROFILE,
    POST_PROFILE,
    UPDT_FNAME,
    UPDT_LNAME,
    UPDT_EMAIL,
    UPDT_DOB,
    UPDT_PHONE,
    UPDT_ADDR1,
    UPDT_ADDR2,
    UPDT_CITY,
    UPDT_POSTCODE,
    UPDT_COUNTRY
  } from '../constants/Profile';
import { PROFILE_CONFIG } from 'configs/AppConfig'

const initProfile = {
    ...PROFILE_CONFIG
  };
  
const profile = (state = initProfile, action) => {
    // console.log(action)
    switch (action.type) {
        case INIT_PROFILE:
            return {
                ...state,
                id: action.payload.username,
                email: action.payload.attributes.email,
                email_verified: action.payload.attributes.email_verified,

            };
        case LOGIN_SUCCEEDED:
            return {
                ...state,
            };
        case PROFILE_UPDATED:
            return {
                ...state,
                ...action.payload
            };
        case POST_PROFILE:
            return {
                ...state,
                ...action.payload
            };
        case GET_PROFILE:
            return {
                ...state,
                // ...action.payload
            };
        default:
            return state;
    }
};
  
  export default profile