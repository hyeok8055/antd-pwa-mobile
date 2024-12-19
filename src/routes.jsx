import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseconfig";
import Main from "./pages/Main";
import Fitness from "./pages/Fitness";
import Weekly from "./pages/Weekly";
import GoogleLogin from "./pages/auth/GoogleLogin";

const AppRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 로딩 중일 때 처리
  if (loading) {
    return <div>로딩 중...</div>; // 로딩 화면이나 스피너 추가 가능
  }

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
