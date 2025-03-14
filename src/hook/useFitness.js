import { useState, useEffect } from 'react';
import { db } from '@/firebaseconfig';
import { collection, query, getDocs, doc, setDoc, orderBy, deleteDoc } from 'firebase/firestore';

export const useFitness = (uid) => {
  const [fitnessData, setFitnessData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFitnessData = async () => {
      if (!uid) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users', uid, 'fitness'),
          orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
          const fitness = doc.data();
          return {
            ...fitness,
            id: doc.id,
            exercises: fitness.exercises.map(exercise => ({ ...exercise, id: doc.id }))
          };
        });
        setFitnessData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFitnessData();
  }, [uid]);

  const uploadData = async (date, weight, exercises) => {
    if (!uid) return;
    setLoading(true);
    try {
      const fitnessDoc = doc(db, 'users', uid, 'fitness', date);
      await setDoc(fitnessDoc, {
        date,
        weight,
        exercises
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async (firebaseId) => {
    if (!uid || !firebaseId) return;
    setLoading(true);
    try {
      const fitnessDoc = doc(db, 'users', uid, 'fitness', firebaseId);
      await deleteDoc(fitnessDoc);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { fitnessData, uploadData, deleteData, loading, error };
};
