import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseconfig';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';
import { getDatabase, ref, get } from "firebase/database";

export const useFood = (uid) => {
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [foodInfo, setFoodInfo] = useState(null);

  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오는 함수
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchTodayFoodData = async () => {
      if (!uid) return;
      const today = getTodayDate();
      try {
        setLoading(true);
        const docRef = doc(db, 'users', uid, 'foods', today);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFoodData(docSnap.data());
        } else {
          // 오늘 데이터가 없으면 초기화 후 Firestore에 저장
          const initialData = {
            date: today,
            breakfast: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            lunch: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            dinner: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            snacks: { foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          };
          await setDoc(docRef, initialData);
          setFoodData(initialData);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayFoodData();
  }, [uid]);

  // Firebase Realtime Database에서 음식 정보 가져오기
  useEffect(() => {
    const fetchFoodInfo = async () => {
        try {
            const db = getDatabase();
            const foodRef = ref(db, 'foods'); // 'foods'는 데이터베이스의 최상위 노드 이름이라고 가정
            const snapshot = await get(foodRef);
            if (snapshot.exists()) {
                // 데이터 구조에 맞게 수정
                const data = snapshot.val();
                const formattedData = {};
                for (const key in data) {
                    formattedData[data[key].name] = data[key];
                }
                setFoodInfo(formattedData);
            } else {
                console.log("No food data available");
                setFoodInfo({});
            }
        } catch (error) {
            console.error("Error fetching food data:", error);
            setError(error);
        }
    };

    fetchFoodInfo();
  }, []);

  const saveMealData = useCallback(
    async (mealType, foods) => {
      if (!uid || !mealType || !foods) return;
      setLoading(true);
      try {
        const today = getTodayDate();
        const docRef = doc(db, 'users', uid, 'foods', today);
        
        // 기존 데이터 가져오기
        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : {
            date: today,
            breakfast: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            lunch: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            dinner: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            snacks: { foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          };

        // 해당 식사 데이터 업데이트
        if (currentData[mealType]) {
          currentData[mealType] = { flag: 1, foods: foods };
        } else {
          currentData[mealType] = { foods: foods };
        }

        await setDoc(docRef, currentData, { merge: true });
        setFoodData(currentData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  const saveCalorieData = useCallback(
    async (mealType, estimatedCalories, actualCalories, selectedFoods) => {
      if (!uid || !mealType) return;
      setLoading(true);
      try {
        const today = getTodayDate();
        const docRef = doc(db, 'users', uid, 'foods', today);
        
        // 기존 데이터 가져오기
        const docSnap = await getDoc(docRef);
         let currentData = docSnap.exists() ? docSnap.data() : {
            date: today,
            breakfast: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            lunch: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            dinner: { flag: 0, foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
            snacks: { foods: [], estimatedCalories: null, actualCalories: null, selectedFoods: [] },
          };

        // 해당 식사 칼로리 데이터 업데이트
        if (currentData[mealType]) {
          currentData[mealType] = {
            ...currentData[mealType],
            estimatedCalories: Number(estimatedCalories),
            actualCalories: Number(actualCalories),
            selectedFoods: selectedFoods,
          };
        } else {
          currentData[mealType] = {
            estimatedCalories: Number(estimatedCalories),
            actualCalories: Number(actualCalories),
            selectedFoods: selectedFoods,
          };
        }

        await setDoc(docRef, currentData, { merge: true });
        setFoodData(currentData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  return { foodData, saveMealData, saveCalorieData, loading, error, foodInfo };
};
