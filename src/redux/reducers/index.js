import { combineReducers } from 'redux';
import authReducer from './authReducer';
import weeklyReducer from './weeklyReducer';
import foodReducer from './foodReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  weekly: weeklyReducer,
  food: foodReducer,
});

export default rootReducer; 