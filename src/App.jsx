import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, BrowserRouter} from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { auth, db, checkDeviceCompatibility, messaging, getToken } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthStatus, clearAuthStatus, setFcmToken } from './redux/actions/authActions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const App = () => {
  const dispatch = useDispatch();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [showNotificationButton, setShowNotificationButton] = useState(false);
  const fcmTokenFromStore = useSelector((state) => state.auth.fcmToken);
  const userId = useSelector((state) => state.auth.user?.uid);

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

  // 알림 권한 요청 함수 수정
  const requestNotificationPermission = async () => {
    const vapidKey = "BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk";

    if (!messaging) {
      console.error("Firebase Messaging is not initialized.");
      return;
    }

    // 서비스 워커 지원 확인
    if (!('serviceWorker' in navigator)) {
      console.log("Service Worker not supported.");
      // 사용자에게 알림 (예: 지원되지 않는 브라우저입니다)
      return;
    }
    if (!('Notification' in window)) {
       console.log("Notifications API not supported.");
       // 사용자에게 알림
       return;
    }


    try {
      // 활성화된 서비스 워커 등록 가져오기 (시간이 걸릴 수 있음)
      const registration = await navigator.serviceWorker.ready;
      console.log("Service Worker registration ready:", registration);

      // 알림 권한 요청
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission); // 상태 업데이트
      console.log("Notification permission status:", permission);

      if (permission === 'granted') {
        console.log("Notification permission granted.");
        setShowNotificationButton(false); // 버튼 숨기기

        try {
          // getToken 호출 시 serviceWorkerRegistration 전달
          const currentToken = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration // 명시적으로 등록 객체 전달
          });

          if (currentToken) {
            console.log("FCM Token:", currentToken);

            // 1. Redux 스토어에 토큰 저장 (기존 토큰과 비교 후 변경 시에만 dispatch 고려)
            if (currentToken !== fcmTokenFromStore) {
                console.log("New or changed FCM token received, updating Redux store.");
                dispatch(setFcmToken(currentToken));
            } else {
                console.log("FCM token is the same as in Redux store.");
            }


            // 2. Firestore 등 서버에 토큰 저장/업데이트 로직 (★ 중요 ★)
            if (userId) {
                try {
                    const userDocRef = doc(db, "users", userId);
                    await updateDoc(userDocRef, { fcmToken: currentToken });
                    console.log("FCM token saved/updated in Firestore for user:", userId);
                } catch (dbError) {
                    console.error("Error saving/updating token to Firestore:", dbError);
                    // Firestore 업데이트 실패 시 에러 처리 (재시도 로직 등 고려)
                }
            } else {
              console.warn("User not logged in, cannot save FCM token to server yet. Token will be saved/updated on next login or app load check.");
            }

          } else {
            console.log('No registration token available. Request permission to generate one.');
            // 토큰을 받지 못한 경우 (권한은 허용했지만 토큰 발급 실패 등)
            // dispatch(setFcmToken(null)); // 필요시 스토어의 토큰 제거
          }
        } catch (getTokenError) {
          console.error('An error occurred while retrieving token. ', getTokenError);
          if (getTokenError.code === 'messaging/invalid-vapid-key') {
            console.error('Invalid VAPID key. Please check your Firebase project settings.');
             // 사용자에게 VAPID 키 오류 알림 등
          }
          // 기타 토큰 관련 오류 처리 (예: 네트워크 오류, 서비스 워커 문제 등)
        }
      } else { // 'denied' 또는 'default' (요청 후 거부)
        console.log("Unable to get permission to notify. Status:", permission);
        // 사용자가 권한을 거부한 경우 UI 업데이트 (예: 버튼 비활성화 또는 안내 메시지)
        if(deviceInfo?.isIOS) {
          // iOS 사용자가 거부했음을 알리는 메시지 (예: 설정에서 직접 켜야 함)
          alert("알림 권한이 거부되었습니다. 푸시 알림을 받으려면 기기의 설정 > 알림에서 권한을 허용해주세요.");
        } else {
          // 비 iOS 사용자가 거부했음을 알림
           alert("알림 권한이 거부되었습니다.");
        }
        setShowNotificationButton(false); // 권한 결정 후 버튼 숨기기 (거부 포함)
      }
    } catch (error) {
      console.error("An error occurred during notification permission or service worker registration: ", error);
      // 서비스 워커 등록 실패 또는 권한 요청 자체의 오류 처리
      alert("알림 기능을 설정하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : {};

            const serializedUser = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              setupCompleted: userData?.setupCompleted || false,
              // fcmToken: userData?.fcmToken // Firestore에서 토큰을 가져올 수도 있음 (선택 사항)
            };
            console.log("User authenticated:", serializedUser);
            dispatch(setAuthStatus(serializedUser));

            // 로그인 시 토큰 확인 및 업데이트 로직 호출
             checkAndRegisterToken();

        } catch (error) {
             console.error("Error fetching user data from Firestore:", error);
             // Firestore 읽기 오류 처리, 기본 정보로 dispatch
             dispatch(setAuthStatus({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                setupCompleted: false, // 안전한 기본값
             }));
        }

      } else {
        console.log("User logged out.");
        dispatch(clearAuthStatus());
        // 로그아웃 시 Redux의 토큰도 지우는 것이 좋음
        dispatch(setFcmToken(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]); // dispatch만 의존성으로 유지

  // 디바이스 정보 초기화 및 알림 권한 상태 확인 로직 통합
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = checkDeviceCompatibility();
      setDeviceInfo(info);
      console.log('디바이스 호환성 정보:', info);

      // 알림 API 지원 여부 먼저 확인
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log("Notifications or Service Worker not supported by this browser.");
        return; // 지원 안 하면 이후 로직 실행 불필요
      }

      // 현재 알림 권한 상태 설정
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);
      console.log("Initial notification permission status:", currentPermission);

      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = info?.isIOS && (isRunningStandalone || window.navigator.standalone);

      if (isIOSPWA) {
        console.log('iOS PWA 모드로 실행 중');
      }

      // 알림 권한 상태에 따른 초기 UI 설정
      if (currentPermission === 'granted') {
        console.log("Notification permission already granted.");
        // 이미 권한이 있으면 토큰 확인/등록 시도 (checkAndRegisterToken 함수 사용)
        checkAndRegisterToken(); // 앱 로드 시 토큰 확인
      } else if (currentPermission === 'denied') {
        console.log("Notification permission previously denied.");
        // 사용자가 이전에 거부한 경우, 버튼을 보여주지 않거나 비활성화된 상태로 보여줌
        // setShowNotificationButton(true); // 단, 클릭해도 효과 없음을 인지시켜야 함
      } else { // 'default' 상태 (아직 결정 안 됨)
        if (info?.isIOS) {
          // iOS: 사용자 클릭 유도를 위해 버튼 표시
          console.log("iOS device detected. Showing notification button for user interaction.");
          setShowNotificationButton(true);
        } else {
          // 비 iOS: 여기서는 바로 요청하지 않고, 필요시 특정 액션 후 요청하거나
          // 사용자가 인지할 수 있는 버튼을 제공하는 것이 좋을 수 있음.
          // 여기서는 일단 버튼 표시 (iOS와 동일하게 처리)
           console.log("Non-iOS device detected, permission state is default. Showing notification button.");
           setShowNotificationButton(true);
          // 또는 checkAndRegisterToken(); // 직접 요청 시도 (사용자 경험 고려)
        }
      }

      // 첫 실행 감지 로직 (단순화)
      const hasRunBefore = localStorage.getItem('pwa_has_run_before');
      if (!hasRunBefore) {
        console.log('앱 첫 실행 감지');
        // setIsFirstRun(true); // 상태 대신 로컬 스토리지 사용
        localStorage.setItem('pwa_has_run_before', 'true');
        // 첫 실행 시 사용자에게 PWA 설치나 알림 설정 안내 등 수행 가능
      }
    }
  }, []); // 초기 마운트 시 한 번만 실행


  // 토큰 확인 및 등록/업데이트 함수 (재사용 가능하도록 분리)
  const checkAndRegisterToken = async () => {
      // 로그인 상태이고, 알림 권한이 허용되었고, 브라우저가 지원하는 경우에만 실행
      if (!userId || Notification.permission !== 'granted' || !('serviceWorker' in navigator) || !messaging) {
          console.log("Conditions not met for checking/registering token:", { userId, permission: Notification.permission, sw: 'serviceWorker' in navigator, messaging: !!messaging });
          return;
      }

      console.log("Checking/Registering FCM token...");
      const vapidKey = "BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk";

      try {
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(messaging, {
              vapidKey: vapidKey,
              serviceWorkerRegistration: registration
          });

          if (currentToken) {
              console.log("Token obtained successfully:", currentToken);
              // 스토어의 토큰과 비교
              if (currentToken !== fcmTokenFromStore) {
                   console.log("Token changed or not in store. Updating Redux store.");
                   dispatch(setFcmToken(currentToken));
              }

              // Firestore와 비교 및 업데이트 (Firestore에서 직접 읽어와 비교하는 것이 더 정확)
              try {
                  const userDocRef = doc(db, "users", userId);
                  const userDoc = await getDoc(userDocRef);
                  const storedToken = userDoc.exists() ? userDoc.data().fcmToken : null;

                  if (currentToken !== storedToken) {
                      console.log("Token mismatch with Firestore or not stored yet. Updating Firestore.");
                      await updateDoc(userDocRef, { fcmToken: currentToken });
                      console.log("FCM token updated in Firestore.");
                  } else {
                      console.log("FCM token is already up-to-date in Firestore.");
                  }
              } catch (dbError) {
                   console.error("Error accessing/updating Firestore during token check:", dbError);
              }

          } else {
              console.log("Could not get FCM token even though permission is granted.");
              // 토큰 발급 실패 시 처리 (예: 서버의 기존 토큰 삭제 고려?)
              // dispatch(setFcmToken(null));
          }
      } catch (error) {
          console.error("Error during token check/registration:", error);
          // getToken 또는 serviceWorker.ready에서 오류 발생 시 처리
      }
  };


  // 테스트 버튼 클릭 핸들러 (기존 유지)
  const handleShowToken = () => {
    console.log("FCM Token from Redux Store:", fcmTokenFromStore);
    if (!fcmTokenFromStore) {
        alert("Redux 스토어에 FCM 토큰이 없습니다. 알림 권한을 먼저 허용해주세요.");
    } else {
        alert(`저장된 FCM 토큰 (Redux):
${fcmTokenFromStore}`); // 간단히 alert로 표시
    }
  };

  return (
    <BrowserRouter>
      {/* PWA 설치 버튼 (기존 유지) */}
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

      {/* --- 테스트용 FCM 토큰 확인 버튼 (기존 유지, 주석 처리됨) --- */}
      {/* <div style={{ ... }}> ... </div> */}

      {/* 알림 권한 요청 버튼 (상태에 따라 표시) */}
      {showNotificationButton && notificationPermission === 'default' && ( // 'default' 상태일 때만 명시적으로 표시
        <div style={{
            position: 'fixed',
            width: '70%', // 너비 조정
            bottom: '80px', // 푸터 위에 위치
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '10px 15px', // 패딩 조정
            borderRadius: '5px', // 조금 더 둥글게
            zIndex: 9999,
            boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
            textAlign: 'center',
            display: 'flex', // Flexbox 사용
            justifyContent: 'space-between', // 양쪽 정렬
            alignItems: 'center' // 세로 중앙 정렬
        }}>
          <span>앱의 중요 알림을 받으시겠어요?</span>
          <button
            onClick={requestNotificationPermission} // 통합된 함수 호출
            style={{
              backgroundColor: 'white',
              color: '#2196F3',
              border: 'none',
              padding: '8px 15px', // 버튼 크기 조정
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px' // 폰트 크기 조정
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
