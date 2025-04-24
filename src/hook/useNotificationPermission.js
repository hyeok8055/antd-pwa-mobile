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

  // FCM 토큰 등록 함수
  const registerFcmToken = useCallback(async () => {
    if (!userId || !messaging || !('serviceWorker' in navigator)) {
      console.log('FCM 토큰 등록 조건 미충족');
      return;
    }
    console.log('FCM 토큰 등록 시도...');
    try {
      const registration = await navigator.serviceWorker.ready;
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('FCM 토큰 발급 성공:', currentToken);
        // Redux 스토어 업데이트 (변경된 경우 - 불필요한 리렌더링 방지)
        if (currentToken !== fcmTokenFromStore) {
          console.log('Redux 스토어 업데이트');
          dispatch(setFcmToken(currentToken));
        }

        // Firestore 업데이트
        try {
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, { fcmToken: currentToken });
          console.log('Firestore에 FCM 토큰 저장/업데이트 완료.');
        } catch (dbError) {
          console.error("Firestore 업데이트 중 오류 발생:", dbError);
        }
      } else {
        console.log('FCM 토큰을 발급받지 못했습니다.');
      }
    } catch (error) {
      console.error('FCM 토큰 등록 중 오류 발생:', error);
    }
  }, [userId, dispatch, fcmTokenFromStore]);

  // 권한 요청 함수 (모든 환경 공통)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.error("알림을 지원하지 않는 브라우저입니다.");
      return;
    }

    try {
      console.log('알림 권한 요청 시도...');
      const permission = await Notification.requestPermission();
      console.log('알림 권한 요청 결과:', permission);
      
      setPermissionStatus(permission);
      setShowPermissionPrompt(false); // 요청 후 프롬프트 숨김

      if (permission === 'granted') {
        // 권한 허용 시 토큰 등록
        registerFcmToken();
      }
    } catch (error) {
      console.error('알림 권한 요청 중 오류:', error);
      setShowPermissionPrompt(false);
    }
  }, [registerFcmToken]);

  // 안드로이드 PWA 알림 권한 요청 반복 체크
  const setupAndroidPwaPermissionCheck = useCallback(() => {
    // 안드로이드 PWA 환경이 아니면 실행하지 않음
    if (!deviceInfo?.isAndroidPWA) return;
    
    console.log('안드로이드 PWA 환경 감지: 알림 권한 주기적 체크 설정');
    
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
      
      // 권한이 거부된 경우에도 프롬프트 표시
      if (currentPermission === 'denied') {
        setShowPermissionPrompt(true);
      }
    }
    
    // 30초마다 권한 상태 체크 및 필요시 알림 요청
    permissionCheckTimerRef.current = setInterval(() => {
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        
        // 권한 상태 업데이트
        setPermissionStatus(currentPermission);
        
        // default 상태이고 프롬프트가 보이지 않는 경우 표시
        if (currentPermission === 'default' && !showPermissionPrompt) {
          setShowPermissionPrompt(true);
        }
        
        // 권한이 이미 부여된 경우 타이머 정리
        if (currentPermission === 'granted') {
          console.log('알림 권한이 허용되었습니다. 주기적 체크 종료.');
          registerFcmToken();
          clearInterval(permissionCheckTimerRef.current);
          permissionCheckTimerRef.current = null;
        }
      }
    }, 30000); // 30초 간격
    
    // 컴포넌트 언마운트 시 타이머 정리를 위한 클린업 함수 반환
    return () => {
      if (permissionCheckTimerRef.current) {
        clearInterval(permissionCheckTimerRef.current);
      }
    };
  }, [deviceInfo?.isAndroidPWA, showPermissionPrompt, registerFcmToken]);

  // 초기 권한 상태 확인 (모든 환경 공통) - 앱 시작 시 1회
  useEffect(() => {
    if ('Notification' in window) {
      const initialPermission = Notification.permission;
      setPermissionStatus(initialPermission);
      console.log('초기 알림 권한 상태:', initialPermission);

      if (initialPermission === 'granted') {
        // 이미 권한이 있으면 토큰 등록 시도
        registerFcmToken();
      }
    } else {
      console.log("이 브라우저는 알림을 지원하지 않습니다.");
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
      // 웹 환경에서는 권한 프롬프트 표시하지 않음 (사용자 액션을 통해 요청)
      setShowPermissionPrompt(false);
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
    isAndroidPwa: deviceInfo?.isAndroidPWA || false
  };
}; 