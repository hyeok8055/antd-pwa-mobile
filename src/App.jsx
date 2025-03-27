import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, messaging, getFCMToken, onMessageListener } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc, setDoc } from 'firebase/firestore';


const App = () => {
  const dispatch = useDispatch();
  const [notification, setNotification] = useState({ title: '', body: '' });
  const [fcmToken, setFcmToken] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

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
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

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

  useEffect(() => {
    let messageUnsubscribe = null;

    const setupNotifications = async () => {
      try {
        if (!('Notification' in window)) {
          console.log('이 브라우저는 알림을 지원하지 않습니다');
          return;
        }

        // 현재 알림 권한 상태 확인
        let permission = Notification.permission;
        
        // 권한이 'default' 상태일 때만 권한 요청
        if (permission === 'default') {
          permission = await Notification.requestPermission();
          console.log('알림 권한 요청 결과:', permission);
        }

        if (permission === 'granted') {
          console.log('알림이 허용되었습니다');
          
          // VAPID 키로 토큰 가져오기
          const token = await getFCMToken('BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk');
          
          if (token) {
            console.log('FCM 토큰:', token);
            setFcmToken(token);
            
            // 로그인된 사용자의 경우 토큰을 Firestore에 저장
            if (auth.currentUser) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                fcmToken: token
              }, { merge: true });
            }
          }

          // 포어그라운드 메시지 수신 처리
          messageUnsubscribe = onMessageListener()
            .then((payload) => {
              console.log('포어그라운드 메시지:', payload);
              setNotification({
                title: payload.notification.title,
                body: payload.notification.body
              });
              
              // 알림 표시
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/icons/favicon.ico',
                badge: '/icons/favicon.ico'
              });
            })
            .catch((err) => console.error('메시지 수신 에러:', err));
        } else if (permission === 'denied') {
          console.log('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
        }
      } catch (error) {
        console.error('알림 설정 중 에러 발생:', error);
      }
    };

    setupNotifications();

    return () => {
      if (messageUnsubscribe) {
        messageUnsubscribe();
      }
    };
  }, []);

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
      
      {/* FCM 토큰 표시 UI - 추후 주석 처리하기 쉽도록 별도 블록으로 분리 */}
      {/* ===== FCM 토큰 UI 시작 ===== */}
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
      {/* ===== FCM 토큰 UI 끝 ===== */}
      
      {/* 알림이 있을 때 표시 (테스트용) */}
      {/* ===== 알림 표시 UI 시작 ===== */}
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
        </div>
      )}
      {/* ===== 알림 표시 UI 끝 ===== */}
      
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
