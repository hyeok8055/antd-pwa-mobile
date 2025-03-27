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
          
          // iOS와 Safari 지원을 위한 추가 체크
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          
          if (isIOS) {
            console.log('iOS 기기 감지됨, 웹 푸시 알림은 iOS 16.4+ 및 Safari에서만 지원됩니다');
          }
          
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

  // 개발 중에만 사용할 토큰 표시 토글 함수
  const toggleTokenVisibility = () => {
    setIsTokenVisible(!isTokenVisible);
  };

  return (
    <BrowserRouter>
      {/* 개발 중에만 사용할 FCM 토큰 표시 UI */}
      {process.env.NODE_ENV === 'development' && (
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
      )}
      
      {/* 알림이 있을 때 표시 (테스트용) */}
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
