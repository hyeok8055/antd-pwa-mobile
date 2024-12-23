import { useState, useCallback } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Food 데이터를 관리하는 Hook
 * @param {string} uid - 사용자 UID
 * @returns {object} - Food 데이터 관리 함수 및 상태
 *
 * Food 데이터 저장 형태 (Firestore):
 * 컬렉션: "food"
 * 문서 ID: {uid}_{date}
 * 데이터 예시:
 * {
 *   "uid": "user123",
 *   "date": "2024-12-23",
 *   "meals": {
 *     "breakfast": "Scrambled eggs",
 *     "lunch": "Chicken salad",
 *     "dinner": "Grilled fish",
 *     "snacks": "Nuts and fruits"
 *   }
 * }
 */
export const useFood = (uid) => {
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Food 데이터 저장
   * @param {string} date - YYYY-MM-DD 형식의 날짜
   * @param {object} data - Food 데이터 (meals)
   */
  const saveFoodData = useCallback(
    async (date, data) => {
      try {
        setLoading(true);
        const docId = `${uid}_${date}`;
        const docRef = doc(db, "food", docId);
        const dataToSave = { ...data, date, uid };

        await setDoc(docRef, dataToSave, { merge: true });
        console.log("Food 데이터 저장 성공");
      } catch (err) {
        console.error("Food 데이터 저장 중 오류:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  /**
   * Food 데이터 가져오기
   * @param {string} date - YYYY-MM-DD 형식의 날짜
   */
  const fetchFoodData = useCallback(
    async (date) => {
      try {
        setLoading(true);
        const docId = `${uid}_${date}`;
        const docRef = doc(db, "food", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFoodData(docSnap.data());
          console.log("Food 데이터 가져오기 성공");
        } else {
          console.log("Food 데이터 없음");
          setFoodData(null);
        }
      } catch (err) {
        console.error("Food 데이터 가져오기 중 오류:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  return {
    foodData,
    saveFoodData,
    fetchFoodData,
    loading,
    error,
  };
};
