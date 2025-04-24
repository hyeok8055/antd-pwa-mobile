import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseconfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDatabase, ref, get, orderByChild, equalTo, query, orderByKey, startAt, endAt, limitToFirst } from 'firebase/database';
import { useSelector } from 'react-redux';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 시간대 기준으로 간식이 어느 식사에 포함되는지 결정
const getSnackMealType = () => {
  const now = new Date();
  const hours = now.getHours();
  
  if (hours >= 0 && hours < 12) {
    return 'breakfast';
  } else if (hours >= 12 && hours < 18) {
    return 'lunch';
  } else {
    // 18시부터 23시59분까지는 저녁
    return 'dinner';
  }
};

export const useFood = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [foodData, setFoodData] = useState(null);
  const uid = useSelector((state) => state.auth.user?.uid);

  useEffect(() => {
    if (uid) {
      fetchFoodData();
    }
  }, [uid]);

  const fetchFoodData = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      const docRef = doc(db, 'users', uid, 'foods', today);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFoodData(docSnap.data());
      } else {
        setFoodData({
          date: today,
          breakfast: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          lunch: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          dinner: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          snacks: { foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
        });
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // 식사 또는 간식 데이터 저장
  const saveFoodData = useCallback(
    async (mealType, foods = [], estimatedCalories = null, actualCalories = null, selectedFoods = [], flag = 0) => {
      if (!uid || !mealType) {
        console.error('uid 또는 mealType이 없습니다:', { uid, mealType });
        return;
      }
      setLoading(true);
      try {
        const today = getTodayDate();
        const docRef = doc(db, 'users', uid, 'foods', today);

        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : {
          date: today,
        };

        // 데이터 유효성 검사 및 기본값 설정
        const validFoods = (foods || []).map(food => ({
          name: food.name || '',
          calories: !isNaN(Number(food.calories)) ? Number(food.calories) : 0,
          weight: !isNaN(Number(food.weight)) ? Number(food.weight) : 0,
          portion: !isNaN(Number(food.portion)) ? Number(food.portion) : 1,
          nutrients: {
            carbs: !isNaN(Number(food.nutrients?.carbs)) ? Number(food.nutrients.carbs) : 0,
            fat: !isNaN(Number(food.nutrients?.fat)) ? Number(food.nutrients.fat) : 0,
            protein: !isNaN(Number(food.nutrients?.protein)) ? Number(food.nutrients.protein) : 0
          }
        })).filter(food => food.name);
        
        // 간식인 경우 시간대에 따라 식사 타입 결정
        if (mealType === 'snacks') {
          const targetMealType = getSnackMealType();
          
          // 기존 식사 데이터 가져오기
          const existingMeal = currentData[targetMealType] || {
            flag: targetMealType !== 'snacks' ? Number(flag) : 0,
            foods: [],
            estimatedCalories: 0,
            actualCalories: 0,
            selectedFoods: [],
          };

          // 기존 간식 데이터 누적 (백업용이 아닌 실제 누적)
          const existingSnacks = currentData.snacks || {
            foods: [],
            estimatedCalories: 0,
            actualCalories: 0,
            selectedFoods: [],
          };

          // 간식 데이터도 누적되게 처리
          currentData.snacks = {
            foods: [...existingSnacks.foods, ...validFoods],
            estimatedCalories: (existingSnacks.estimatedCalories || 0) + (estimatedCalories !== null ? Number(estimatedCalories) : 0),
            actualCalories: (existingSnacks.actualCalories || 0) + (actualCalories !== null ? Number(actualCalories) : 0),
            selectedFoods: [...(existingSnacks.selectedFoods || []), ...(selectedFoods || [])],
          };
          
          // 식사 데이터에 간식 데이터 통합
          currentData[targetMealType] = {
            flag: Number(existingMeal.flag),
            foods: [...existingMeal.foods, ...validFoods],
            estimatedCalories: (existingMeal.estimatedCalories || 0) + (estimatedCalories !== null ? Number(estimatedCalories) : 0),
            actualCalories: (existingMeal.actualCalories || 0) + (actualCalories !== null ? Number(actualCalories) : 0),
            selectedFoods: [...(existingMeal.selectedFoods || []), ...(selectedFoods || [])],
          };
        } else {
          // 일반 식사인 경우 기존 로직 유지
          currentData[mealType] = {
            flag: Number(flag),
            foods: validFoods,
            estimatedCalories: estimatedCalories !== null ? Number(estimatedCalories) : null,
            actualCalories: actualCalories !== null ? Number(actualCalories) : null,
            selectedFoods: selectedFoods || [],
          };
        }

        await setDoc(docRef, currentData, { merge: true });
        setFoodData(currentData);
      } catch (err) {
        console.error('저장 중 에러 발생:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const fetchFoodDetails = useCallback(async (foodNames) => {
    if (!foodNames || foodNames.length === 0) return [];
    setLoading(true);
    try {
      const rtdb = getDatabase();
      const foodDetails = [];

      for (const foodName of foodNames) {
        try {
          // name 속성으로만 조회
          const nameQueryRef = query(
            ref(rtdb, 'foods'),
            orderByChild('name'),
            equalTo(foodName),
            limitToFirst(1)
          );
          
          const nameQuerySnapshot = await get(nameQueryRef);
          
          if (nameQuerySnapshot.exists()) {
            // name 속성으로 찾았을 경우 (첫 번째 결과만 사용)
            let foodData;
            nameQuerySnapshot.forEach((childSnapshot) => {
              foodData = childSnapshot.val();
              return true; // forEach 루프 중단
            });
            
            foodDetails.push({
              name: foodName,
              calories: foodData.calories || 0,
              weight: foodData.weight || '100g',
              nutrients: {
                carbs: foodData.nutrients?.carbs || 0,
                fat: foodData.nutrients?.fat || 0,
                protein: foodData.nutrients?.protein || 0
              },
              ...foodData
            });
          } else {
            // 찾지 못한 경우
            console.log(`${foodName}에 대한 정보가 없습니다.`);
            foodDetails.push({ 
              name: foodName, 
              calories: 0,
              weight: '100g',
              nutrients: {
                carbs: 0,
                fat: 0,
                protein: 0
              }
            });
          }
        } catch (queryErr) {
          console.error(`${foodName} 조회 중 오류 발생:`, queryErr);
          // 오류 발생 시에도 기본값 추가
          foodDetails.push({ 
            name: foodName, 
            calories: 0,
            weight: '100g',
            nutrients: {
              carbs: 0,
              fat: 0,
              protein: 0
            }
          });
        }
      }
      
      return foodDetails;
    } catch (err) {
      console.error('음식 정보를 가져오는 중 오류 발생:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, foodData, saveFoodData, fetchFoodDetails };
};
