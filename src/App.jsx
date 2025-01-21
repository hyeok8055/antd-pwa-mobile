import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc } from 'firebase/firestore';
import { Toast } from 'antd-mobile';
import { requestForToken, onMessageListener } from './firebaseconfig';  

const App = () => {
  const dispatch = useDispatch();
  const [notification, setNotification] = useState({ title: '', body: '' });

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

    // 알림 권한 요청 및 토큰 설정
    const setupNotifications = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('알림 허용 상태:', permission);
        
        if (permission === 'granted') {
          const token = await requestForToken();
          if (token) {
            console.log('FCM 토큰 설정 완료');
          }

          // 포어그라운드 메시지 수신 처리
          messageUnsubscribe = onMessageListener()
            .then((payload) => {
              console.log('포어그라운드 메시지:', payload);
              
              setNotification({
                title: payload.notification.title,
                body: payload.notification.body
              });

              // Toast 알림 표시
              Toast.show({
                content: `${payload.notification.title}\n${payload.notification.body}`,
                duration: 3000,
                position: 'top'
              });

              // 네이티브 알림 표시
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/logo.png',
                badge: '/logo.png',
                data: payload.data
              });
            })
            .catch((err) => console.log('메시지 수신 에러:', err));
        }
        if (permission === 'denied') {
          console.log('알림이 거부되었어요');
        }
      } else {
        console.log('알림이 지원되지 않는 환경입니다');
      }
    };

    setupNotifications();

    // cleanup 함수
    return () => {
      if (messageUnsubscribe) {
        messageUnsubscribe();
      }
    };
  }, []);

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
