import { SET_AUTH_STATUS, CLEAR_AUTH_STATUS } from '../actions/actionTypes';

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_AUTH_STATUS:
      return {
        ...state,
        isAuthenticated: !!action.payload,
        user: action.payload,
      };
    case CLEAR_AUTH_STATUS:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      };
    default:
      return state;
  }
};

export default authReducer; 