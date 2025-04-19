import { SET_AUTH_STATUS, CLEAR_AUTH_STATUS, SET_FCM_TOKEN } from '../actions/actionTypes';

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  fcmToken: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_AUTH_STATUS:
      return {
        ...state,
        isAuthenticated: !!action.payload,
        user: {
          ...action.payload,
          setupCompleted: action.payload.setupCompleted || false,
        },
      };
    case CLEAR_AUTH_STATUS:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        fcmToken: null,
      };
    case SET_FCM_TOKEN:
      return {
        ...state,
        fcmToken: action.payload,
      };
    default:
      return state;
  }
};

export default authReducer; 