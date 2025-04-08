import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, checkDeviceCompatibility } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { Modal, Button } from 'antd-mobile';

const App = () => {
  const dispatch = useDispatch();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // PWA 설치 관련 이벤트 핸들러
  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
      console.log('PWA 설치 가능: beforeinstallprompt 이벤트 발생');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 첫 실행 감지 및 iOS 홈 화면 추가 여부 확인
  useEffect(() => {
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSPWA = deviceInfo?.isIOS && (isRunningStandalone || window.navigator.standalone);

    const hasRunBefore = localStorage.getItem('pwa_has_run_before');

    if (!hasRunBefore) {
      console.log('앱 첫 실행 감지');
      setIsFirstRun(true);
      localStorage.setItem('pwa_has_run_before', 'true');
    }
  }, [deviceInfo]);

  // PWA 설치 함수
  const installPwa = async () => {
    if (!deferredPrompt) {
      console.log('설치 프롬프트가 없습니다');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`사용자 선택: ${outcome}`);

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // 사용자 인증 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data() || {};

        const serializedUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          setupCompleted: userData?.setupCompleted || false,
        };

        dispatch(setAuthStatus(serializedUser));

      } else {
        dispatch(clearAuthStatus());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  // 디바이스 정보 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = checkDeviceCompatibility();
      setDeviceInfo(info);
      console.log('디바이스 호환성 정보:', info);

      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = info?.isIOS && (isRunningStandalone || window.navigator.standalone);

      if (isIOSPWA) {
        console.log('iOS PWA 모드로 실행 중');
      }
    }
  }, []);

  return (
    <BrowserRouter>
      {/* PWA 설치 버튼 */}
      {showInstallPrompt && (
        <div style={{ 
          position: 'fixed',
          width: '70%',
          top: '10px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          padding: '10px 15px',
          borderRadius: '5px',
          zIndex: 10000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          display: 'flex',
          justifyContent: 'space-between', // 변경: 좌우 끝으로 정렬
          alignItems: 'center', // 변경: 세로 중앙 정렬
        }}>
          <span>모든 기능을 사용하기 위해 <br />앱 설치를 권장합니다</span>
          <button 
            onClick={installPwa}
            style={{
              backgroundColor: 'white',
              color: '#4CAF50',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >설치
            </span>
          </button>
        </div>
      )}
      
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
      if (!user?.setupCompleted && location.pathname !== '/intro') {
        navigate('/intro');
      } else if (user?.setupCompleted && location.pathname === '/intro') {
        navigate('/main');
      }
    } else if (location.pathname !== '/googlelogin') {
      navigate('/googlelogin');
    }
  }, [isAuthenticated, user?.setupCompleted, location.pathname, navigate]);

  const hiddenRoutes = ['/googlelogin', '/intro'];
  const shouldHideHeaderFooter = hiddenRoutes.includes(location.pathname);

  return (
    <div className="app h-screen overflow-y-auto overflow-x-hidden flex flex-col">
      {!shouldHideHeaderFooter && (
        <div className="h-[60px] z-10">
          <Header />
        </div>
      )}
      <div className={`flex-1 ${!shouldHideHeaderFooter ? 'mb-[70px]' : ''}`}>
        <AppRoutes />
      </div>
      {!shouldHideHeaderFooter && (
        <div className="h-[70px] fixed bottom-0 left-0 right-0 bg-white border-t">
          <Footer />
        </div>
      )}
    </div>
  );
};

export default App;
