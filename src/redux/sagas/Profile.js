import { all, takeEvery, put, fork, call } from 'redux-saga/effects';
import Amplify, {API} from 'aws-amplify';
import awsconfig from '../../aws-exports';
import {
    LOGIN_SUCCEEDED,
    INIT_PROFILE,
    GET_PROFILE,
    PROFILE_UPDATED,
    POST_PROFILE,
    // UPDT_FNAME,
    // UPDT_LNAME,
    // UPDT_EMAIL,
    // UPDT_DOB,
    // UPDT_PHONE,
    // UPDT_ADDR1,
    // UPDT_ADDR2,
    // UPDT_CITY,
    // UPDT_POSTCODE,
    // UPDT_COUNTRY
} from '../constants/Profile';
import {
    initProfile,
    updateProfile,
    postProfile
} from "../actions/Profile";

const apiName = 'playercardsapi';
// fields we don't persist to the player table
const excludedFields = ['league_admin_info','modified','date_added','memberships'] 
Amplify.configure(awsconfig);

export function* loginSucceededSaga() {
    yield takeEvery(LOGIN_SUCCEEDED, function* ({payload}) {
        // console.log('payload to send to init profile',payload)
        // when logging in first time, no user session value is there
        if(!payload.signInUserSession){
            console.log('no sign in user session', payload)
        }
        else{
            try {
                yield put(initProfile(payload));
            } catch (err) {
                yield put(console.error(err))
            }
        }


    });
}

export function* initProfileSaga() {
    yield takeEvery(INIT_PROFILE, function* ({payload}) {
        // console.log('INIT_PROFILE event', payload)
        try {
            // console.log(payload);
            const path =  `/profile/${payload.username}`;
            const myInit = {
              headers: {},
              response: true,
              queryStringParameters: {}
            }
            const response = yield call([API, 'get'], apiName, path, myInit );
            yield put(updateProfile({
                ...response.data
            }));
        }
        catch (err){
            console.error(err)
            // yield put(console.error(err))
        }
    })

} 

export function* getProfileSaga() {
    yield takeEvery(GET_PROFILE, function* ({payload}) {
        // console.log('GET_PROFILE', payload)
        try {
            const path =  `/profile/${payload}`;
            const myInit = {
              headers: {},
              response: true,
              queryStringParameters: {}
            }
            const response = yield call([API, 'get'], apiName, path, myInit );
            yield put(updateProfile({
                ...response.data
            }));
        }
        catch (err){
            console.error(err)
            // yield put(console.error(err))
        }
    })

} 

export function* postProfileSaga() {

    yield takeEvery(PROFILE_UPDATED, function* ({payload}) {
        // console.log('PROFILE_UPDATED', payload)
        for(let k in payload){
            if(excludedFields.includes(k)){
                // console.log('This is excluded', k)
                delete payload[k]
            }
        }
        try {
            const path =  `/profile/${payload.id}`;
            const myInit = {
              headers: {},
              response: true,
              body: payload,
            }
            // yield call([API, 'put'], apiName, path, myInit ); // not doing this anymore - not necessary
            // yield put(postProfile({response}));
        }
        catch(err) {
            console.log(err)
        }
    })
}


export default function* rootSaga() {
    yield all([
        fork(loginSucceededSaga),
        fork(initProfileSaga),
        fork(postProfileSaga),
        fork(getProfileSaga)
    ])
}