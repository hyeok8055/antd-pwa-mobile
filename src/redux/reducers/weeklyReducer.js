import { SET_WEEKLY_DATA, CLEAR_WEEKLY_DATA } from '../actions/actionTypes';

const initialState = {
  weeklyData: null,
  lastFetched: null,
};

const weeklyReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_WEEKLY_DATA:
      return {
        ...state,
        weeklyData: action.payload,
        lastFetched: new Date().toISOString(),
      };
    case CLEAR_WEEKLY_DATA:
      return initialState;
    default:
      return state;
  }
};

export default weeklyReducer; 