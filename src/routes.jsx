import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Main from "./pages/Main";
import Fitness from "./pages/fitness/Fitness";
import Weekly from "./pages/Weekly";
import GoogleLogin from "./pages/auth/GoogleLogin";
import { useSelector } from 'react-redux';

const AppRoutes = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return (
    <Routes>
      {/* 초기 경로 처리 */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/main" : "/googlelogin"} />}
      />
      {/* Google 로그인 페이지 */}
      <Route path="/googlelogin" element={<GoogleLogin />} />
      {/* 인증된 사용자만 접근 가능한 라우트 */}
      {isAuthenticated ? (
        <>
          <Route path="/main" element={<Main />} />
          <Route path="/fitness" element={<Fitness />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="*" element={<Navigate to="/main" />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/googlelogin" />} />
      )}
    </Routes>
  );
};

export default AppRoutes;
