import { all } from 'redux-saga/effects';
import Auth from './Auth';
import Profile from './Profile';

export default function* rootSaga(getState) {
  yield all([
    Auth(),
    Profile(),
  ]);
}
