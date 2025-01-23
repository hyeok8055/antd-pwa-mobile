import { SET_FOODS } from '../actions/actionTypes';

const initialState = {
  foods: null,
};

const foodReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_FOODS:
      return {
        ...state,
        foods: action.payload,
      };
    default:
      return state;
  }
};

export default foodReducer;