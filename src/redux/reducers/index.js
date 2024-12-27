import { combineReducers } from 'redux';
import authReducer from './authReducer';
import weeklyReducer from './weeklyReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  weekly: weeklyReducer,
});

export default rootReducer; 