import { combineReducers } from 'redux';
import Auth from './Auth';
import Theme from './Theme';
import Profile from './Profile';

const reducers = combineReducers({
    theme: Theme,
    auth: Auth,
    profile: Profile
});

export default reducers;