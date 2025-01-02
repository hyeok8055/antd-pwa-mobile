import React, { useEffect } from 'react';
import { useLocation, useNavigate, BrowserRouter } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc } from 'firebase/firestore';

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firestore에서 사용자 정보 확인
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        const serializedUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          setupCompleted: userData?.setupCompleted || false, // setupCompleted 상태 추가
        };
        
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
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (isAuthenticated) {
      // 설정이 완료되지 않은 사용자는 intro 페이지로
      if (!user?.setupCompleted && location.pathname !== '/intro') {
        navigate('/intro');
      }
      // 설정이 완료된 사용자가 intro 페이지에 접근하면 main으로
      else if (user?.setupCompleted && location.pathname === '/intro') {
        navigate('/main');
      }
    } else if (location.pathname !== '/googlelogin') {
      navigate('/googlelogin');
    }
  }, [isAuthenticated, user?.setupCompleted, location.pathname, navigate]);

  // Header와 Footer를 숨길 라우트 목록
  const hiddenRoutes = ['/googlelogin', '/intro'];
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
