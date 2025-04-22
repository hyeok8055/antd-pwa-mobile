import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseconfig';
import { setAuthStatus, clearAuthStatus } from '../redux/actions/authActions';

export const useAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};

          const serializedUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            setupCompleted: userData?.setupCompleted || false,
          };
          console.log("User authenticated (hook):", serializedUser);
          dispatch(setAuthStatus(serializedUser));
        } catch (error) {
          console.error("Error fetching user data from Firestore (hook):", error);
          // Firestore 읽기 오류 시 기본 정보로 dispatch
          dispatch(setAuthStatus({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            setupCompleted: false, // 안전한 기본값
          }));
        }
      } else {
        console.log("User logged out (hook).");
        dispatch(clearAuthStatus());
      }
    });

    // 클린업 함수: 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [dispatch]); // dispatch 함수가 변경될 때만 effect 재실행 (일반적으로는 안 변함)

  // 이 훅은 상태를 직접 반환하기보다는 effect 실행에 중점을 둡니다.
  // 필요하다면 여기서 auth 상태를 반환하도록 수정할 수 있습니다.
}; 