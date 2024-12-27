import { SET_WEEKLY_DATA, CLEAR_WEEKLY_DATA } from './actionTypes';

export const setWeeklyData = (data) => ({
  type: SET_WEEKLY_DATA,
  payload: data,
});

export const clearWeeklyData = () => ({
  type: CLEAR_WEEKLY_DATA,
}); 