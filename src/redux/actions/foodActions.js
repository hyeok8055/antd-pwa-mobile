import { SET_FOODS } from './actionTypes';

export const setFoods = (foods) => ({
  type: SET_FOODS,
  payload: foods,
});