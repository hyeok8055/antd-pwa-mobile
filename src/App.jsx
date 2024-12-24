import React, { useEffect } from 'react';
import { useLocation, useNavigate, BrowserRouter } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth } from './firebaseconfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const serializedUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        };
        console.log("serializedUser:", serializedUser);
        dispatch(setAuthStatus(serializedUser));
      } else {
        dispatch(clearAuthStatus());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ConditionalHeaderFooter />
    </BrowserRouter>
  );
};

const ConditionalHeaderFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

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
        <div className="h-[5%] z-10">
          <Header />
        </div>
      )}
      <div className="flex-1 h-[88%]">
        <AppRoutes />
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
