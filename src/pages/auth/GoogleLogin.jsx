import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from 'react-google-button';
import { auth } from "../../firebaseconfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const GoogleLogin = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    const provider = new GoogleAuthProvider(); // provider 구글 설정
    signInWithPopup(auth, provider) // 팝업창 띄워서 로그인
      .then((data) => {
        console.log(data); // 콘솔에 UserCredentialImpl 출력
        navigate('/main'); // 로그인 성공 시 main 페이지로 이동
      })
      .catch((err) => {
        console.error('로그인 오류:', err);
      });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg px-10 py-6 text-center w-96">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Google 로그인
        </h1>
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
