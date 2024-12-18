import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from 'react-google-button'
const GoogleLogin = () => {
  const navigate = useNavigate();

  // Google OAuth 2.0 클라이언트 ID (실제 ID로 변경해야 함)
  // const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

  // Google 로그인 URL 생성
  // const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=code&scope=openid%20profile%20email&redirect_uri=http://localhost:3000/auth/google/callback`;

  // 로그인 버튼 클릭 시 Google 로그인 페이지로 이동
  const handleLogin = () => {
    // window.location.href = googleLoginUrl; // 이 부분은 주석 처리

    // 로그인 상태를 true로 변경하고 로컬 스토리지에 저장
    localStorage.setItem('isAuthenticated', 'true');

    // 메인 페이지로 이동
    navigate('/main');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Google 로그인</h1>
      <GoogleButton
        onClick={handleLogin}
      >
        Google 계정으로 로그인
      </GoogleButton>
    </div>
  );
};

export default GoogleLogin; 