import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from 'react-google-button';
import { auth, db } from "../../firebaseconfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useDispatch } from 'react-redux';
import { setAuthStatus } from '../../redux/actions/authActions';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

const GoogleLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 필요한 정보만 추출
      const serializedUser = {
        uid: user.uid,
        displayName: user.displayName || "익명 사용자",
        email: user.email || "이메일 없음",
        photoURL: user.photoURL || null, // 프로필 사진 URL
      };

      // Firestore에 사용자 정보 저장 또는 업데이트
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      const userData = {
          name: serializedUser.displayName,
          email: serializedUser.email,
          photoURL: serializedUser.photoURL,
          lastLoginAt: serverTimestamp(),
      };

      if (!userDoc.exists()) {
        userData.createdAt = serverTimestamp();
      }

      await setDoc(userRef, userData, { merge: true });

      // Redux에 인증 상태 저장
      dispatch(setAuthStatus(serializedUser));

      // 메인 페이지로 이동
      navigate('/main');
    } catch (err) {
      console.error("Google 로그인 오류:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg px-10 py-6 text-center w-96">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Google 로그인</h1>
        <p className="text-gray-600 mb-6">
          Google 계정을 사용해 손쉽게 로그인하세요!
        </p>
        <GoogleButton
          onClick={handleGoogleLogin}
          style={{ width: '100%', margin: '0 auto' }}
        />
      </div>
    </div>
  );
};

export default GoogleLogin;
