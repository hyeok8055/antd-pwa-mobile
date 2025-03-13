import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import NotificationPermissionModal from './components/NotificationPermissionModal';
import { auth, db, getFCMToken, onMessageListener, isWebPushSupported } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus } from './redux/actions/authActions';
import { doc, getDoc, setDoc } from 'firebase/firestore';


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

    const setupNotifications = async () => {
      try {
        // 웹 푸시 지원 확인
        if (!isWebPushSupported()) {
          // console.log('이 브라우저는 웹 푸시 알림을 지원하지 않습니다');
          return;
        }

        // 현재 알림 권한 상태 확인
        let permission = Notification.permission;
        
        // iOS Safari에서는 'standalone' 모드(PWA)인지 확인
        const isPWA = window.navigator.standalone || 
                     window.matchMedia('(display-mode: standalone)').matches;
        
        // console.log('PWA 모드 실행 여부:', isPWA);
        
        // 권한이 'default' 상태일 때만 권한 요청
        if (permission === 'default') {
          // iOS에서는 사용자 제스처(버튼 클릭 등)가 필요하므로 자동 요청은 피함
          // 여기서는 PWA 모드에서만 자동 요청
          if (isPWA) {
            permission = await Notification.requestPermission();
            // console.log('알림 권한 요청 결과:', permission);
          }
        }

        if (permission === 'granted') {
          // console.log('알림이 허용되었습니다');
          // VAPID 키로 토큰 가져오기
          const token = await getFCMToken('BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk');
          
          if (token) {
            // console.log('FCM 토큰:', token);
            // 로그인된 사용자의 경우 토큰을 Firestore에 저장
            if (auth.currentUser) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                fcmToken: token,
                platform: navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'iOS' : 'other'
              }, { merge: true });
            }
          }

          // 포어그라운드 메시지 수신 처리
          messageUnsubscribe = onMessageListener()
            .then((payload) => {
              // console.log('포어그라운드 메시지:', payload);
              
              // iOS에서 알림 표시
              new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/logo.png',
                badge: '/logo.png'
              });
            })
            // .catch((err) => console.error('메시지 수신 에러:', err));
        } else if (permission === 'denied') {
          // console.log('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
        }
      } catch (error) {
        // console.error('알림 설정 중 에러 발생:', error);
      }
    };

    setupNotifications();

    return () => {
      if (messageUnsubscribe) {
        messageUnsubscribe();
      }
    };
  }, []);

  // 알림 권한 요청 버튼 컴포넌트 (iOS에서는 사용자 제스처 필요)
  const RequestNotificationButton = () => {
    const handleRequestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        // console.log('알림 권한 요청 결과:', permission);
        if (permission === 'granted') {
          setupNotifications(); // 권한이 부여된 후 알림 설정
        }
      } catch (error) {
        // console.error('권한 요청 실패:', error);
      }
    };

    // iOS에서 알림이 아직 허용되지 않았을 때만 버튼 표시
    if (Notification.permission !== 'granted' && 
        (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'))) {
      return (
        <button 
          onClick={handleRequestPermission}
          className="btn bg-blue-500 text-white px-4 py-2 rounded"
        >
          알림 허용하기
        </button>
      );
    }
    return null;
  };

  return (
    <BrowserRouter>
      <NotificationPermissionModal />
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
