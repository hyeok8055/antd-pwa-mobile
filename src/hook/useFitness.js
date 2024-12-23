import { useState, useCallback } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Fitness 데이터를 관리하는 Hook
 * @param {string} uid - 사용자 UID
 * @returns {object} - Fitness 데이터 관리 함수 및 상태
 *
 * Fitness 데이터 저장 형태 (Firestore):
 * 컬렉션: "fitness"
 * 문서 ID: {uid}_{date}
 * 데이터 예시:
 * {
 *   "uid": "user123",
 *   "date": "2024-12-23",
 *   "height": 175,
 *   "weight": 70,
 *   "exercises": [
 *     { "name": "Running", "duration": "1h 0m" },
 *     { "name": "Cycling", "duration": "0h 45m" }
 *   ]
 * }
 */
export const useFitness = (uid) => {
  const [fitnessData, setFitnessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fitness 데이터 저장
   * @param {string} date - YYYY-MM-DD 형식의 날짜
   * @param {object} data - Fitness 데이터 (height, weight, exercises)
   */
  const saveFitnessData = useCallback(
    async (date, data) => {
      try {
        setLoading(true);
        const docId = `${uid}_${date}`;
        const docRef = doc(db, "fitness", docId);
        const dataToSave = { ...data, date, uid };

        await setDoc(docRef, dataToSave, { merge: true });
        console.log("Fitness 데이터 저장 성공");
      } catch (err) {
        console.error("Fitness 데이터 저장 중 오류:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  /**
   * Fitness 데이터 가져오기
   * @param {string} date - YYYY-MM-DD 형식의 날짜
   */
  const fetchFitnessData = useCallback(
    async (date) => {
      try {
        setLoading(true);
        const docId = `${uid}_${date}`;
        const docRef = doc(db, "fitness", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFitnessData(docSnap.data());
          console.log("Fitness 데이터 가져오기 성공");
        } else {
          console.log("Fitness 데이터 없음");
          setFitnessData(null);
        }
      } catch (err) {
        console.error("Fitness 데이터 가져오기 중 오류:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  return {
    fitnessData,
    saveFitnessData,
    fetchFitnessData,
    loading,
    error,
  };
};
