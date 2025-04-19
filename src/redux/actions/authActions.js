import { SET_AUTH_STATUS, CLEAR_AUTH_STATUS, SET_FCM_TOKEN } from './actionTypes';

export const setAuthStatus = (user) => ({
  type: SET_AUTH_STATUS,
  payload: user,
});

export const clearAuthStatus = () => ({
  type: CLEAR_AUTH_STATUS,
});

export const setFcmToken = (token) => ({
  type: SET_FCM_TOKEN,
  payload: token,
}); 
