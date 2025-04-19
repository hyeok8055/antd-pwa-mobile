import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, checkDeviceCompatibility, messaging, getToken } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus, setFcmToken } from './redux/actions/authActions';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { Modal, Button } from 'antd-mobile';

const App = () => {
  const dispatch = useDispatch();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [showNotificationButton, setShowNotificationButton] = useState(false);
  const fcmTokenFromStore = useSelector((state) => state.auth.fcmToken);

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

  // 알림 권한 요청 함수
  const requestNotificationPermission = async () => {
    const vapidKey = "BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk";

    if (!messaging) {
      console.error("Firebase Messaging is not initialized.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      console.log("Notification permission status:", permission);

      if (permission === 'granted') {
        console.log("Notification permission granted.");
        setShowNotificationButton(false);
        
        try {
            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) {
                console.log("FCM Token:", currentToken);
                
                dispatch(setFcmToken(currentToken));
                
                // TODO: 얻어온 토큰을 Firestore나 백엔드 서버에 저장하는 로직 구현
                // 예: storeTokenInFirestore(user.uid, currentToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
                // 토큰이 없을 경우 스토어의 토큰도 비워주는 것이 좋을 수 있음 (선택적)
                // dispatch(setFcmToken(null));
            }
        } catch (getTokenError) {
             console.error('An error occurred while retrieving token. ', getTokenError);
             if (getTokenError.code === 'messaging/invalid-vapid-key') {
                 console.error('Invalid VAPID key. Please check your Firebase project settings.');
                 // 사용자에게 VAPID 키 오류 알림
             }
             // 기타 토큰 관련 오류 처리
        }
      } else {
        console.log("Unable to get permission to notify.");
        // 사용자가 권한을 거부한 경우 UI 업데이트 (예: 버튼 비활성화 또는 메시지 표시)
        if(deviceInfo?.isIOS) {
          // iOS 사용자가 거부했음을 알리는 메시지 표시 등
        }
      }
    } catch (error) {
      console.error("An error occurred while requesting notification permission. ", error);
      // 오류 처리 로직 (예: 사용자에게 오류 메시지 표시)
    }
  };

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

  // 디바이스 정보 초기화 및 알림 권한 요청 로직 통합
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = checkDeviceCompatibility();
      setDeviceInfo(info);
      console.log('디바이스 호환성 정보:', info);
      
      // 알림 권한 상태 업데이트
      setNotificationPermission(Notification.permission);

      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = info?.isIOS && (isRunningStandalone || window.navigator.standalone);

      if (isIOSPWA) {
        console.log('iOS PWA 모드로 실행 중');
      }

      // --- 알림 권한 요청 로직 시작 ---
      // Notification API 지원 여부 확인
      if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return;
      }
      
      // 현재 권한 상태 확인
      const currentPermission = Notification.permission;
      console.log("Current notification permission:", currentPermission);
      
      if (currentPermission === 'granted') {
        console.log("Notification permission already granted.");
        // 이미 권한이 있으면 토큰 가져오기 시도 (선택적: 앱 로드 시마다 토큰 갱신 확인)
        // requestNotificationPermission(); // 필요하다면 주석 해제 (VAPID 키 설정 후)
      } else if (currentPermission === 'denied') {
        console.log("Notification permission previously denied.");
        // 사용자가 이전에 거부한 경우, 다시 요청하지 않음 (또는 UI 안내)
        if (info?.isIOS) {
            // iOS이고 거부된 상태면 버튼을 보여줄 수도 있음 (단, 클릭해도 효과 없음)
            // setShowNotificationButton(true); // 사용자가 설정에서 직접 바꿔야 함
        }
      } else { // 'default' 상태 (아직 결정 안 됨)
        if (info?.isIOS) {
          // iOS: 사용자 클릭을 위해 버튼 표시
          console.log("iOS device detected. Showing notification button.");
          setShowNotificationButton(true);
        } else {
          // 비 iOS: 직접 권한 요청 (앱 로드 시)
          console.log("Non-iOS device detected. Requesting notification permission directly.");
          requestNotificationPermission(); // 주석 해제하여 바로 요청 가능
          // 또는 특정 조건 만족 시 요청 (예: 로그인 후)
        }
      }
      // --- 알림 권한 요청 로직 끝 ---

      // 첫 실행 감지 로직
      const hasRunBefore = localStorage.getItem('pwa_has_run_before');
      if (!hasRunBefore) {
        console.log('앱 첫 실행 감지');
        setIsFirstRun(true);
        localStorage.setItem('pwa_has_run_before', 'true');
      }
    }
  }, []); // 초기 마운트 시 한 번만 실행

  // 테스트 버튼 클릭 핸들러
  const handleShowToken = () => {
    console.log("FCM Token from Redux Store:", fcmTokenFromStore);
    if (!fcmTokenFromStore) {
        alert("Redux 스토어에 FCM 토큰이 없습니다. 알림 권한을 먼저 허용해주세요.");
    } else {
        alert(`저장된 FCM 토큰:\n${fcmTokenFromStore}`); // 간단히 alert로 표시
    }
  };

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
      
      {/* --- 테스트용 FCM 토큰 확인 버튼 --- */}
      <div style={{
          position: 'fixed',
          top: '70px', // PWA 설치 버튼 아래에 위치
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998, // 다른 UI 요소와의 z-index 고려
          padding: '5px'
      }}>
          <Button 
              size='small' 
              color='primary' 
              fill='outline'
              onClick={handleShowToken}
          >
              FCM 토큰 확인 (콘솔/Alert)
          </Button>
      </div>
      {/* --- 테스트 버튼 끝 --- */}
      
      {/* iOS 알림 권한 요청 버튼 */} 
      {showNotificationButton && deviceInfo?.isIOS && notificationPermission === 'default' && (
        <div style={{ 
          position: 'fixed',
          width: '70%',
          bottom: '80px', // 푸터 위에 위치하도록 조정 (Footer 높이 고려)
          left: '50%', 
          transform: 'translateX(-50%)', 
          backgroundColor: '#2196F3', // 파란색 계열로 변경
          color: 'white', 
          padding: '10px 15px',
          borderRadius: '5px',
          zIndex: 9999, // PWA 설치 버튼보다 아래에 위치 (선택 사항)
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          textAlign: 'center' // 텍스트 중앙 정렬
        }}>
          <span>중요 업데이트 알림을 받으시겠어요?</span>
          <button 
            onClick={requestNotificationPermission}
            style={{
              backgroundColor: 'white',
              color: '#2196F3',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginLeft: '10px', // 문구와 버튼 사이 간격
              fontWeight: 'bold'
            }}
          >
            알림 받기
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
