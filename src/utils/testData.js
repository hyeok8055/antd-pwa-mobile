export const generateTestFoodData = (bmr) => {
  const mealCalories = bmr / 3; // 하루 기준 칼로리의 1/3

  return {
    breakfast: {
      actualCalories: mealCalories + 300, // 초과 섭취 테스트
      flag: 1,
    },
    lunch: {
      actualCalories: mealCalories - 200, // 부족 섭취 테스트
      flag: 1,
    },
    dinner: {
      actualCalories: mealCalories + 500, // 많은 초과 섭취 테스트
      flag: 1,
    },
  };
};

// 테스트용 더미 데이터 적용
const testBMR = 2000; // 테스트용 BMR
const dummyFoodData = generateTestFoodData(testBMR); 