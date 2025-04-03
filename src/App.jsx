import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, messaging, getFCMToken, onMessageListener, checkDeviceCompatibility, VAPID_KEY, ensureServiceWorkerRegistration } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { Modal } from 'antd-mobile';

const App = () => {
  const dispatch = useDispatch();
  const [notification, setNotification] = useState({ title: '', body: '' });
  const [fcmToken, setFcmToken] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // PWA 설치 관련 이벤트 핸들러
  useEffect(() => {
    // beforeinstallprompt 이벤트 처리
    const handleBeforeInstallPrompt = (event) => {
      // 브라우저 기본 설치 배너 방지
      event.preventDefault();
      // 이벤트 저장
      setDeferredPrompt(event);
      // 설치 버튼 표시
      setShowInstallPrompt(true);
      console.log('PWA 설치 가능: beforeinstallprompt 이벤트 발생');
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 이미 설치된 경우 이벤트 처리
    window.addEventListener('appinstalled', () => {
      console.log('PWA가 성공적으로 설치되었습니다');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      // PWA 설치 후 첫 실행 여부 확인
      setIsFirstRun(true);
      
      // iOS에서 PWA 설치 후 알림 권한 확인 
      if (deviceInfo?.isIOS) {
        // PWA 설치 직후 iOS에서는 알림 권한을 다시 확인
        checkNotificationPermission();
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, [deviceInfo]);

  // 첫 실행 감지 및 iOS 홈 화면 추가 여부 확인
  useEffect(() => {
    // iOS에서 홈 화면에 추가된 PWA 감지
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSPWA = deviceInfo?.isIOS && (isRunningStandalone || window.navigator.standalone);
    
    // 앱이 처음 실행되었는지 확인 (localStorage 사용)
    const hasRunBefore = localStorage.getItem('pwa_has_run_before');
    
    if (!hasRunBefore) {
      console.log('앱 첫 실행 감지');
      setIsFirstRun(true);
      localStorage.setItem('pwa_has_run_before', 'true');
      
      // iOS PWA에서 첫 실행 시 추가 작업
      if (isIOSPWA) {
        console.log('iOS PWA 첫 실행 감지');
        // 서비스 워커 등록 확인
        ensureServiceWorkerRegistration();
      }
    }
  }, [deviceInfo]);

  // 알림 권한 확인 함수
  const checkNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission !== 'granted') {
      // iOS에서 알림 권한 요청이 필요한 경우 모달 표시
      if (deviceInfo?.isIOS) {
        Modal.confirm({
          content: (
            <div style={{ padding: '10px 0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                알림 활성화가 필요합니다
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#666', textAlign: 'center' }}>
                iOS에서 백그라운드 알림을 받으려면 알림 권한을 허용해주세요.
              </p>
            </div>
          ),
          confirmText: '알림 설정하기',
          cancelText: '나중에',
          onConfirm: async () => {
            // iOS에서 알림 권한 요청
            try {
              const token = await getFCMToken(VAPID_KEY);
              if (token) {
                setFcmToken(token);
                console.log('iOS 디바이스에서 알림 권한 획득 성공');
                Modal.alert({
                  content: '알림이 성공적으로 활성화되었습니다!',
                  confirmText: '확인',
                });
              }
            } catch (error) {
              console.error('iOS 알림 권한 요청 오류:', error);
            }
          }
        });
      }
    }
  };

  // PWA 설치 함수
  const installPwa = async () => {
    if (!deferredPrompt) {
      console.log('설치 프롬프트가 없습니다');
      return;
    }

    // 설치 프롬프트 표시
    deferredPrompt.prompt();
    // 사용자 선택 대기
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`사용자 선택: ${outcome}`);
    
    // deferredPrompt 초기화
    setDeferredPrompt(null);
    // 설치 버튼 숨기기
    setShowInstallPrompt(false);
  };

  // 사용자 인증 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firestore에서 사용자 정보 확인
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data() || {};

        const serializedUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          setupCompleted: userData?.setupCompleted || false,
        };
        
        dispatch(setAuthStatus(serializedUser));
        
        // 로그인 성공 시 FCM 토큰 설정
        setupNotifications(user.uid);
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
      
      // iOS 홈 화면 추가 여부 확인
      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = info?.isIOS && (isRunningStandalone || window.navigator.standalone);
      
      if (isIOSPWA) {
        console.log('iOS PWA 모드로 실행 중');
        // iOS PWA에서 서비스 워커 등록 확인
        ensureServiceWorkerRegistration();
      }
    }
  }, []);

  // 알림 설정 함수 (iOS 개선)
  const setupNotifications = async (userId) => {
    try {
      // 브라우저가 알림을 지원하는지 확인
      if (!('Notification' in window)) {
        console.log('이 브라우저는 알림을 지원하지 않습니다.');
        return;
      }

      // 디바이스 호환성 검사
      if (deviceInfo?.isIOS && !deviceInfo?.isCompatibleIOS) {
        console.log('iOS 16.4 미만에서는 웹 푸시 알림이 지원되지 않습니다.');
        // 사용자에게 알림 지원 불가 메시지를 표시할 수 있음
        return;
      }

      // iOS PWA에서 서비스 워커 등록 확인 (백그라운드 알림에 중요)
      if (deviceInfo?.isIOS) {
        await ensureServiceWorkerRegistration();
      }

      // 알림 권한이 거부되었는지 먼저 확인
      if (Notification.permission === 'denied') {
        console.log('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
        return; // 거부된 경우 함수 종료
      }
      
      // FCM 토큰 요청 (getFCMToken 내부에서 'default' 상태 시 권한 요청 처리)
      const token = await getFCMToken(VAPID_KEY);

      // 토큰을 성공적으로 가져온 경우
      if (token) {
        console.log('FCM 토큰 획득 성공 (현재 권한:', Notification.permission, ')');
        setFcmToken(token);

        // iOS 디바이스인 경우 추가 확인
        if (deviceInfo?.isIOS) {
          console.log('iOS 디바이스에서 FCM 토큰 획득 성공. 백그라운드 알림이 가능합니다.');
        }

        // 사용자 문서에 토큰 저장
        try {
          // 디바이스 정보
          const deviceData = {
            fcmToken: token,
            lastUpdated: new Date(),
            platform: deviceInfo?.isIOS ? 'iOS' : 
                      /android/i.test(navigator.userAgent) ? 'Android' : 'Web',
            userAgent: navigator.userAgent,
            // iOS PWA 상태 추가
            isPWA: window.matchMedia('(display-mode: standalone)').matches || 
                  (deviceInfo?.isIOS && window.navigator.standalone),
            // 기기 고유 식별자 대신 브라우저 세션마다 다른 임의의 ID 생성
            deviceId: `${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`,
          };

          // 토큰 컬렉션 구조로 변경 (여러 기기 지원)
          const tokensRef = collection(doc(db, 'users', userId), 'fcmTokens');
          
          // 기존 토큰 찾기 (이 기기의 이전 토큰)
          const existingToken = deviceData.deviceId ? 
            await getDoc(doc(tokensRef, deviceData.deviceId)) : null;

          if (existingToken?.exists()) {
            // 기존 토큰 업데이트
            await updateDoc(doc(tokensRef, deviceData.deviceId), deviceData);
          } else {
            // 새 토큰 추가
            await addDoc(tokensRef, deviceData);
          }

          // 호환성을 위해 기존 필드도 유지
          await updateDoc(doc(db, 'users', userId), {
            fcmToken: token,
            lastTokenUpdate: new Date()
          });
          
          console.log('FCM 토큰이 Firestore에 저장되었습니다.');
        } catch (error) {
          console.error('FCM 토큰 저장 중 오류:', error);
        }

      } else {
        // 토큰 가져오기 실패 (권한 거부 또는 기타 오류)
        console.log('FCM 토큰을 가져올 수 없습니다. 최종 권한 상태:', Notification.permission);

        // iOS 디바이스에서 알림 권한이 필요한 경우 알림
        if (deviceInfo?.isIOS && Notification.permission !== 'granted') {
          console.log('iOS 디바이스에서 알림 권한이 없습니다. 권한 요청이 필요합니다.');
        }
      }

    } catch (error) {
      console.error('알림 설정 중 오류:', error);
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
      
      {/* 알림 표시 UI */}
      {notification.title && (
        <div 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            backgroundColor: '#4CAF50', 
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 9999,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          <h3>{notification.title}</h3>
          <p>{notification.body}</p>
          <button 
            onClick={() => setNotification({ title: '', body: '' })}
            style={{ 
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              borderRadius: '3px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '5px'
            }}
          >
            닫기
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
