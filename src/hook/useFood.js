import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseconfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDatabase, ref, get } from 'firebase/database';
import { useSelector } from 'react-redux';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
          calories: Number(food.calories || 0),
          weight: Number(food.weight || 0),
          nutrients: {
            carbs: Number(food.nutrients?.carbs || 0),
            fat: Number(food.nutrients?.fat || 0),
            protein: Number(food.nutrients?.protein || 0)
          }
        })).filter(food => food.name);

        currentData[mealType] = {
          flag: mealType !== 'snacks' ? Number(flag) : Number(currentData[mealType]?.flag || 0),
          foods: validFoods,
          estimatedCalories: estimatedCalories !== null ? Number(estimatedCalories) : null,
          actualCalories: actualCalories !== null ? Number(actualCalories) : null,
          selectedFoods: selectedFoods || [],
        };

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
        const foodRef = ref(rtdb, `foods/${foodName}`);
        const snapshot = await get(foodRef);

        if (snapshot.exists()) {
          foodDetails.push({
            name: foodName,
            ...snapshot.val()
          });
        } else {
          console.log(`${foodName}에 대한 정보가 없습니다.`);
          foodDetails.push({ name: foodName, error: '정보 없음' });
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
