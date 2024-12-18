import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Main from './pages/Main';
import Fitness from './pages/Fitness';
import Weekly from './pages/Weekly';
import GoogleLogin from './pages/GoogleLogin';

const AppRoutes = ({ isAuthenticated }) => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/main" />} />
      <Route path="/googlelogin" element={<GoogleLogin />} />
      {/* 인증된 사용자만 접근 가능한 라우트 */}
      {isAuthenticated ? (
        <>
          <Route path="/main" element={<Main />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/weekly" element={<Weekly />} />
          {/* 추가적인 인증 필요한 라우트들 */}
          <Route path="*" element={<Navigate to="/main" />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/googlelogin" />} />
      )}
    </Routes>
  );
};

export default AppRoutes; 