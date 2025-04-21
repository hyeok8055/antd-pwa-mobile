import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Main from "./pages/Main";
import Fitness from "./pages/fitness/Fitness";
// import Weekly from "./pages/Weekly";
import GoogleLogin from "./pages/auth/GoogleLogin";
import { useSelector } from 'react-redux';
import FoodList from "./pages/food/FoodList";
import CaloriEntry from "./pages/calories/CaloriEntry";
import Intro from "./pages/auth/Intro";
import QnA from "./pages/QnA/qna";
import AdminPage from "./pages/auth/AdminPage";
import CalorieAdminPage from "./pages/auth/CalorieAdminPage";

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
          {/* <Route path="/weekly" element={<Weekly />} /> */}
          <Route path="/meals/:mealType" element={<FoodList />} />
          <Route path="/calories/calorieEntry" element={<CaloriEntry />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/qna" element={<QnA />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/calorie-admin" element={<CalorieAdminPage />} />
          <Route path="*" element={<Navigate to="/main" />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/googlelogin" />} />
      )}
    </Routes>
  );
};

export default AppRoutes;
