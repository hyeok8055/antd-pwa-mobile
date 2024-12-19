import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth } from './firebaseconfig'; // Firebase 설정 파일 경로 확인
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Firebase Auth 상태 확인 및 인증 지속성 설정
  useEffect(() => {
    // 인증 상태 지속성을 localPersistence로 설정
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Firebase 인증 상태가 localPersistence로 설정되었습니다.");
      })
      .catch((error) => {
        console.error("지속성 설정 오류:", error);
      });

    // Firebase 인증 상태 확인
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true); // 로그인 상태 설정
      } else {
        setIsAuthenticated(false); // 로그아웃 상태 설정
      }
    });

    // 리스너 정리
    return () => unsubscribe();
  }, []);

  return (
    <Router initialEntries={['/googlelogin']}>
      <ConditionalHeaderFooter isAuthenticated={isAuthenticated} />
    </Router>
  );
};

const ConditionalHeaderFooter = ({ isAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 로그인되지 않은 사용자가 main 접근 시 GoogleLogin으로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated && location.pathname === '/main') {
      navigate('/googlelogin');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Header와 Footer를 숨길 라우트 목록
  const hiddenRoutes = ['/googlelogin'];

  const shouldHideHeaderFooter = hiddenRoutes.includes(location.pathname);

  return (
    <div className="app h-screen overflow-y-auto overflow-x-hidden flex flex-col">
      {!shouldHideHeaderFooter && (
        <div className="h-[7%]">
          <Header />
        </div>
      )}
      <div className="flex-1 h-[86%] border-b border-gray-200">
        <AppRoutes isAuthenticated={isAuthenticated} />
      </div>
      {!shouldHideHeaderFooter && (
        <div className="fixed bottom-0 left-0 right-0 h-[7%] bg-white shadow-md flex items-center border-t border-gray-300">
          <Footer />
        </div>
      )}
    </div>
  );
};

export default App;
