import { SET_AUTH_STATUS, CLEAR_AUTH_STATUS } from './actionTypes';

export const setAuthStatus = (user) => ({
  type: SET_AUTH_STATUS,
  payload: user,
});

export const clearAuthStatus = () => ({
  type: CLEAR_AUTH_STATUS,
}); 