import { combineReducers } from 'redux';
import authReducer from './authReducer'; // authReducer 추가

const rootReducer = combineReducers({
  auth: authReducer, // auth 상태 추가
  // ... 다른 리듀서 추가 ...
});

export default rootReducer; 