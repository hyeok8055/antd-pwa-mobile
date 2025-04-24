import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, updateDoc } from 'firebase/firestore';
import { messaging, getToken, db } from '../firebaseconfig'; // Firebase 인스턴스 가져오기
import { useDeviceInfo } from './useDeviceInfo'; // 디바이스 정보 훅
import { setFcmToken } from '../redux/actions/authActions'; // Redux 액션

// VAPID 키 (환경 변수 등으로 관리하는 것이 더 안전합니다)
const VAPID_KEY = "BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk";

export const useNotificationPermission = () => {
  const dispatch = useDispatch();
  const deviceInfo = useDeviceInfo();
  const userId = useSelector((state) => state.auth.user?.uid);
  const fcmTokenFromStore = useSelector((state) => state.auth.fcmToken);

  // 알림 권한 상태 관리
  const [permissionStatus, setPermissionStatus] = useState('default');
  // 알림 권한 요청 프롬프트 표시 여부
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  // 주기적 체크를 위한 타이머 참조 (Android PWA용)
  const permissionCheckTimerRef = useRef(null);
  // Vite PWA에 의해 서비스 워커가 등록되었는지 확인
  const [swAvailable, setSwAvailable] = useState(false);

  // 서비스 워커 상태 확인 함수
  const checkServiceWorkerStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('서비스 워커가 지원되지 않는 브라우저입니다');
      return false;
    }

    try {
      // 등록된 서비스 워커 확인
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log('서비스 워커가 등록되어 있습니다:', registrations);
        setSwAvailable(true);
        
        // 테스트: 서비스 워커와 통신 시도
        if (registrations[0].active) {
          try {
            // 서비스 워커가 활성화되었는지 확인하기 위한 메시지 전송
            registrations[0].active.postMessage({
              type: 'SW_STATUS_CHECK'
            });
          } catch (e) {
            console.log('서비스 워커 통신 테스트 실패:', e);
          }
        }
        
        return true;
      } else {
        console.log('등록된 서비스 워커가 없습니다');
        setSwAvailable(false);
        return false;
      }
    } catch (error) {
      console.error('서비스 워커 상태 확인 중 오류:', error);
      return false;
    }
  }, []);

  // FCM 토큰 등록 함수
  const registerFcmToken = useCallback(async () => {
    if (!userId || !messaging) {
      console.log('FCM 토큰 등록 조건 미충족 (userId 또는 messaging 없음)');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('서비스 워커가 지원되지 않아 FCM 토큰을 등록할 수 없습니다');
      return;
    }

    try {
      console.log('FCM 토큰 등록 시도...');
      
      // 서비스 워커 준비 대기
      const registration = await navigator.serviceWorker.ready;
      console.log('서비스 워커 준비 완료, 토큰 발급 시도:', registration);
      
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('FCM 토큰 발급 성공:', currentToken);
        // Redux 스토어 업데이트 (변경된 경우에만)
        if (currentToken !== fcmTokenFromStore) {
          console.log('Redux 스토어에 FCM 토큰 업데이트');
          dispatch(setFcmToken(currentToken));
        }

        // Firestore 업데이트
        try {
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, { fcmToken: currentToken });
          console.log('Firestore에 FCM 토큰 저장/업데이트 완료');
          
          // 테스트 알림 표시 시도 (서비스 워커 활성화 확인용)
          try {
            if (registration.active) {
              registration.active.postMessage({ 
                type: 'FIREBASE_MESSAGING_TEST'
              });
            }
          } catch (e) {
            console.log('테스트 알림 요청 오류:', e);
          }
          
          return currentToken;
        } catch (dbError) {
          console.error("Firestore 업데이트 중 오류 발생:", dbError);
        }
      } else {
        console.log('FCM 토큰을 발급받지 못했습니다');
      }
    } catch (error) {
      console.error('FCM 토큰 등록 중 오류 발생:', error);
    }
    
    return null;
  }, [userId, dispatch, fcmTokenFromStore]);

  // 권한 요청 함수 (모든 환경 공통)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.error("알림을 지원하지 않는 브라우저입니다");
      return;
    }

    try {
      console.log('알림 권한 요청 시도...');
      
      // 서비스 워커 상태 확인
      await checkServiceWorkerStatus();
      
      // 권한 요청
      const permission = await Notification.requestPermission();
      console.log('알림 권한 요청 결과:', permission);
      
      setPermissionStatus(permission);
      setShowPermissionPrompt(false); // 요청 후 프롬프트 숨김

      if (permission === 'granted') {
        // 권한 허용 시 FCM 토큰 등록
        const token = await registerFcmToken();
        
        // 권한 허용 확인을 위한 테스트 알림
        if (token) {
          try {
            // 앱에서 직접 알림 생성 (서비스 워커가 활성화되기 전에도 작동)
            new Notification('알림 권한 허용됨', {
              body: '알림 시스템이 활성화되었습니다',
              icon: '/icons/maskable_icon_x192.png'
            });
          } catch (e) {
            console.error('테스트 알림 생성 오류:', e);
          }
        }
      }
    } catch (error) {
      console.error('알림 권한 요청 중 오류:', error);
      setShowPermissionPrompt(false);
    }
  }, [registerFcmToken, checkServiceWorkerStatus]);

  // 안드로이드 PWA 알림 권한 요청 반복 체크
  const setupAndroidPwaPermissionCheck = useCallback(() => {
    // 안드로이드 PWA 환경이 아니면 실행하지 않음
    if (!deviceInfo?.isAndroidPWA) return;
    
    console.log('안드로이드 PWA 환경 감지: 알림 권한 주기적 체크 설정');
    
    // 서비스 워커 상태 확인
    checkServiceWorkerStatus();
    
    // 이미 타이머가 있으면 정리
    if (permissionCheckTimerRef.current) {
      clearInterval(permissionCheckTimerRef.current);
    }
    
    // 초기 권한 상태 확인
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermissionStatus(currentPermission);
      console.log('현재 안드로이드 PWA 알림 권한 상태:', currentPermission);
      
      // 이미 허용된 경우 토큰 등록
      if (currentPermission === 'granted') {
        registerFcmToken();
        return; // 이미 허용되었으면 타이머 설정 필요 없음
      }
      
      // 권한이 결정되지 않았거나 거부된 경우 프롬프트 표시
      setShowPermissionPrompt(true);
    }
    
    // 15초마다 권한 상태 체크 및 필요시 알림 요청
    permissionCheckTimerRef.current = setInterval(() => {
      if ('Notification' in window) {
        // 서비스 워커 상태도 주기적으로 확인
        checkServiceWorkerStatus();
        
        const currentPermission = Notification.permission;
        
        // 권한 상태 업데이트
        setPermissionStatus(currentPermission);
        
        // default 또는 denied 상태이고 프롬프트가 보이지 않는 경우 표시
        if ((currentPermission === 'default' || currentPermission === 'denied') && !showPermissionPrompt) {
          setShowPermissionPrompt(true);
        }
        
        // 권한이 이미 부여된 경우 타이머 정리
        if (currentPermission === 'granted') {
          console.log('알림 권한이 허용되었습니다. 주기적 체크 종료');
          registerFcmToken();
          clearInterval(permissionCheckTimerRef.current);
          permissionCheckTimerRef.current = null;
        }
      }
    }, 15000); // 15초 간격
    
    // 컴포넌트 언마운트 시 타이머 정리를 위한 클린업 함수 반환
    return () => {
      if (permissionCheckTimerRef.current) {
        clearInterval(permissionCheckTimerRef.current);
      }
    };
  }, [deviceInfo?.isAndroidPWA, showPermissionPrompt, registerFcmToken, checkServiceWorkerStatus]);

  // 서비스 워커 메시지 이벤트 리스너 등록
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const messageHandler = (event) => {
      if (event.data && event.data.type) {
        console.log('서비스 워커로부터 메시지 수신:', event.data);
        
        // 서비스 워커 상태 응답 처리
        if (event.data.type === 'SW_STATUS_RESPONSE') {
          setSwAvailable(true);
        }
      }
    };
    
    navigator.serviceWorker.addEventListener('message', messageHandler);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', messageHandler);
    };
  }, []);

  // 초기 서비스 워커 상태 확인
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 페이지 로드 후 1초 후에 확인 (PWA 서비스 워커 등록 시간 허용)
      const timer = setTimeout(() => {
        checkServiceWorkerStatus();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [checkServiceWorkerStatus]);

  // 초기 권한 상태 확인 (모든 환경 공통) - 앱 시작 시 1회
  useEffect(() => {
    if ('Notification' in window) {
      const initialPermission = Notification.permission;
      setPermissionStatus(initialPermission);
      console.log('초기 알림 권한 상태:', initialPermission);

      if (initialPermission === 'granted') {
        // 이미 권한이 있으면 토큰 등록 시도
        // 페이지 로드 후 2초 후에 시도 (서비스 워커 등록 시간 허용)
        const timer = setTimeout(() => {
          registerFcmToken();
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    } else {
      console.log("이 브라우저는 알림을 지원하지 않습니다");
    }
  }, [registerFcmToken]);

  // 디바이스 환경별 알림 권한 처리 로직
  useEffect(() => {
    // deviceInfo가 로드되지 않았거나 알림 API를 지원하지 않으면 종료
    if (!deviceInfo || !('Notification' in window)) {
      return;
    }

    // 1. 안드로이드 PWA 환경 처리
    if (deviceInfo.isAndroidPWA) {
      console.log('안드로이드 PWA 환경 감지: 전용 알림 권한 로직 적용');
      const cleanupFn = setupAndroidPwaPermissionCheck();
      return cleanupFn; // 클린업 함수 반환
    }
    
    // 2. iOS PWA 환경 처리 (iOS 16.4+ 지원)
    else if (deviceInfo.isIOSPWA && deviceInfo.isCompatibleIOS) {
      console.log('iOS PWA 환경 감지 (16.4+): 프롬프트 표시');
      // iOS에서는 권한이 default 상태일 때만 프롬프트 표시
      if (permissionStatus === 'default') {
        setShowPermissionPrompt(true);
      } else {
        setShowPermissionPrompt(false);
      }
    }
    
    // 3. 웹 환경 처리 (Android PWA, iOS PWA 제외한 모든 환경)
    else {
      console.log('일반 웹 환경 감지: 표준 알림 권한 로직 적용');
      // 웹 환경에서는 수동 요청을 위해 default 상태일 때 프롬프트 표시
      if (permissionStatus === 'default') {
        setShowPermissionPrompt(true);
      } else {
        setShowPermissionPrompt(false);
      }
    }
  }, [deviceInfo, permissionStatus, setupAndroidPwaPermissionCheck]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (permissionCheckTimerRef.current) {
        clearInterval(permissionCheckTimerRef.current);
        permissionCheckTimerRef.current = null;
      }
    };
  }, []);

  return { 
    permissionStatus, 
    showPermissionPrompt, 
    requestPermission,
    isAndroidPwa: deviceInfo?.isAndroidPWA || false,
    swAvailable
  };
}; 