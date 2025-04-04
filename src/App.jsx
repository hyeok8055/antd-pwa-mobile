import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, getFCMToken, checkDeviceCompatibility, VAPID_KEY, ensureServiceWorkerRegistration } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { Modal, Button } from 'antd-mobile';

const App = () => {
  const dispatch = useDispatch();
  const [fcmToken, setFcmToken] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState(Notification.permission);

  // PWA 설치 관련 이벤트 핸들러
  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
      console.log('PWA 설치 가능: beforeinstallprompt 이벤트 발생');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      console.log('PWA가 성공적으로 설치되었습니다');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setIsFirstRun(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
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

      if (isIOSPWA) {
        console.log('iOS PWA 첫 실행 감지');
        ensureServiceWorkerRegistration();
      }
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

        // 로그인 성공 시 알림 권한 확인 및 (이미 허용된 경우) 토큰 설정
        checkPermissionAndSetupToken(user.uid);

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
        ensureServiceWorkerRegistration();
      }
      // 초기 알림 권한 상태 설정
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  // 알림 권한 확인 및 (이미 허용된 경우) FCM 토큰 설정 함수
  const checkPermissionAndSetupToken = async (userId) => {
    try {
      if (!('Notification' in window)) {
        console.log('이 브라우저는 알림을 지원하지 않습니다.');
        return;
      }

      if (deviceInfo?.isIOS && !deviceInfo?.isCompatibleIOS) {
        console.log('iOS 16.4 미만에서는 웹 푸시 알림이 지원되지 않습니다.');
        return;
      }

      if (deviceInfo?.isIOS) {
        await ensureServiceWorkerRegistration();
      }

      const currentPermission = Notification.permission;
      setNotificationPermissionStatus(currentPermission); // 상태 업데이트
      console.log('현재 알림 권한 상태:', currentPermission);

      // 권한 상태가 'granted'일 때만 토큰 요청 및 저장
      if (currentPermission === 'granted') {
        console.log('알림 권한이 이미 허용되어 있습니다. FCM 토큰 요청 시작.');
        const token = await getFCMToken(VAPID_KEY);

        if (token) {
          console.log('FCM 토큰 획득 성공:', token);
          setFcmToken(token);
          await saveTokenToFirestore(userId, token);
        } else {
          console.log('FCM 토큰을 가져올 수 없습니다. (권한은 granted 상태)');
          // 서비스 워커 문제일 수 있음
          Modal.alert({ content: '알림 설정 중 문제가 습니다. (토큰 발급 실패)', confirmText: '확인' });
        }
      } else if (currentPermission === 'denied') {
        console.log('알림 권한이 차단되었습니다.');
      } else { // 'default'
        console.log('알림 권한이 아직 설정되지 않았습니다. 사용자 요청 필요.');
      }

    } catch (error) {
      console.error('알림 권한 확인/토큰 설정 중 오류:', error);
      Modal.alert({ content: '알림 설정 확인 중 오류가 발생했습니다.', confirmText: '확인' });
    }
  };

  // Firestore에 토큰 저장 함수 (분리)
  const saveTokenToFirestore = async (userId, token) => {
    try {
      const deviceData = {
        fcmToken: token,
        lastUpdated: new Date(),
        platform: deviceInfo?.isIOS ? 'iOS' :
                  /android/i.test(navigator.userAgent) ? 'Android' : 'Web',
        userAgent: navigator.userAgent,
        isPWA: window.matchMedia('(display-mode: standalone)').matches ||
              (deviceInfo?.isIOS === true && window.navigator.standalone) || false,
        // deviceId는 동일 기기/브라우저 세션에서 재로그인 시 토큰 업데이트를 위해 필요할 수 있음
        // 여기서는 간단하게 매번 새 문서를 추가하는 방식으로 구현 (개선 가능)
        deviceId: `${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`,
      };

      const tokensRef = collection(doc(db, 'users', userId), 'fcmTokens');
      const userDocRef = doc(db, 'users', userId);

      // 사용자 문서 업데이트 (호환성)
      await updateDoc(userDocRef, {
        fcmToken: token, 
        lastTokenUpdate: new Date()
      });
      // 토큰 컬렉션에 추가
      await addDoc(tokensRef, deviceData);

      console.log('FCM 토큰이 Firestore에 저장되었습니다.');
    } catch (error) {
      console.error('FCM 토큰 저장 중 오류:', error);
      Modal.alert({ content: '토큰 저장 중 오류가 발생했습니다.', confirmText: '확인' });
    }
  };

  // 사용자가 직접 알림 권한을 요청하는 함수
  const requestNotificationPermission = async () => {
    if (!('Notification' in window) || !auth.currentUser) {
      console.warn('알림을 지원하지 않거나 사용자가 로그인하지 않았습니다.');
      return;
    }
    const userId = auth.currentUser.uid;

    try {
      console.log('사용자 클릭: 알림 권한 요청 시작...');
      const permission = await Notification.requestPermission();
      setNotificationPermissionStatus(permission); // 상태 업데이트
      console.log('권한 요청 결과:', permission);

      if (permission === 'granted') {
        Modal.alert({ content: '알림 권한이 허용되었습니다.', confirmText: '확인' });
        // 권한 허용 시 바로 토큰 요청 및 저장
        console.log('권한 허용됨. FCM 토큰 요청 시작.');
        const token = await getFCMToken(VAPID_KEY);
        if (token) {
          console.log('FCM 토큰 획득 성공:', token);
          setFcmToken(token);
          await saveTokenToFirestore(userId, token);
        } else {
          console.log('FCM 토큰을 가져올 수 없습니다. (권한 획득 직후)');
          Modal.alert({ content: '알림 설정 중 문제가 발생했습니다. (토큰 발급 실패)', confirmText: '확인' });
        }
      } else if (permission === 'denied') {
        Modal.alert({ 
          content: '알림 권한이 거부되었습니다. 앱 설정이나 브라우저 설정에서 직접 변경해주세요.', 
          confirmText: '확인'
        });
      } else { // 'default' (사용자가 창을 닫음 등)
        Modal.alert({ content: '알림 권한 설정이 완료되지 않았습니다.', confirmText: '확인' });
      }
    } catch (error) {
      console.error('알림 권한 요청 중 오류:', error);
      Modal.alert({ content: '알림 권한 요청 중 오류가 발생했습니다.', confirmText: '확인' });
    }
  };

  // 토큰 표시 토글 함수
  const toggleTokenVisibility = () => {
    setIsTokenVisible(!isTokenVisible);
  };

  return (
    <BrowserRouter>
      {/* PWA 설치 버튼 */}
      {showInstallPrompt && (
        <div style={{ 
          position: 'fixed', 
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
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>앱으로 설치하여 더 나은 경험을 누려보세요!</span>
          <button 
            onClick={installPwa}
            style={{
              backgroundColor: 'white',
              color: '#4CAF50',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            설치하기
          </button>
        </div>
      )}
      
      {/* 알림 권한 요청 버튼 (상태가 'default'일 때만 표시) */}
      {notificationPermissionStatus === 'default' && (
        <div style={{ 
          position: 'fixed', 
          top: showInstallPrompt ? '60px' : '10px', // 설치 버튼과 겹치지 않도록 조정
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 9999, 
        }}>
          <Button 
            color='primary' 
            fill='solid' 
            onClick={requestNotificationPermission}
          >
            알림 허용하기
          </Button>
        </div>
      )}
      
      {/* FCM 토큰 표시 UI - 개발용 */}
      <div style={{ position: 'fixed', bottom: '70px', right: '10px', zIndex: 9999 }}>
        <button onClick={toggleTokenVisibility} 
          style={{ padding: '5px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
          {isTokenVisible ? '토큰 숨기기' : '토큰 보기'}
        </button>
        {isTokenVisible && fcmToken && (
          <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#f0f0f0', borderRadius: '5px', maxWidth: '300px', wordBreak: 'break-all' }}>
            {fcmToken}
          </div>
        )}
      </div>
      
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
