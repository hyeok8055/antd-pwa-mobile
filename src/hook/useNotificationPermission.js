import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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

  const [permissionStatus, setPermissionStatus] = useState('default');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

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

        // Firestore 업데이트 (항상 덮어쓰기/생성)
        try {
            const userDocRef = doc(db, "users", userId);
            // 비교 로직 제거하고 항상 updateDoc 호출
            await updateDoc(userDocRef, { fcmToken: currentToken });
            console.log('Firestore에 FCM 토큰 저장/업데이트 완료.');
        } catch (dbError) {
            console.error("Firestore 업데이트 중 오류 발생:", dbError);
        }

      } else {
        console.log('FCM 토큰을 발급받지 못했습니다.');
        // 토큰 발급 실패 시, Firestore의 토큰을 지울지 여부는 정책에 따라 결정
        // 예: await updateDoc(doc(db, "users", userId), { fcmToken: null });
      }
    } catch (error) {
      console.error('FCM 토큰 등록 중 오류 발생:', error);
    }
  }, [userId, dispatch, fcmTokenFromStore]);

  // 초기 권한 상태 확인 및 토큰 등록 (권한이 이미 granted인 경우)
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
  }, [registerFcmToken]); // registerFcmToken 의존성 추가

  // 권한 상태 및 디바이스 정보에 따라 프롬프트 표시 여부 결정
  useEffect(() => {
    if (deviceInfo && permissionStatus === 'default') {
      // iOS 16.4 이상인 경우에만 프롬프트 표시
      if (deviceInfo.isIOS && deviceInfo.isCompatibleIOS) {
         console.log("iOS 16.4+ 감지, 알림 프롬프트 표시");
         setShowPermissionPrompt(true);
      } else if (!deviceInfo.isIOS) {
          // 안드로이드 또는 다른 OS의 경우 (필요하다면 여기서 바로 권한 요청 또는 다른 방식의 프롬프트 표시 가능)
          // 현재 요구사항: iOS만 특별 처리, 나머지는 사용자가 직접 설정 유도 또는 다른 버튼 통해 요청
          console.log("Non-iOS device, permission default. 프롬프트 자동 표시 안 함.");
          // setShowPermissionPrompt(true); // 필요 시 주석 해제
      }
    } else {
      setShowPermissionPrompt(false); // granted, denied 상태 또는 deviceInfo 로드 전에는 숨김
    }
  }, [deviceInfo, permissionStatus]);

  // 권한 요청 함수 (사용자 클릭에 의해 호출되어야 함)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.error("Notifications not supported.");
      return;
    }
    if (permissionStatus !== 'default') {
        console.log("이미 권한 상태가 결정되었습니다.", permissionStatus);
        return;
    }

    try {
      const currentPermission = await Notification.requestPermission();
      setPermissionStatus(currentPermission);
      setShowPermissionPrompt(false); // 요청 후 프롬프트 숨김
      console.log('알림 권한 요청 결과:', currentPermission);

      if (currentPermission === 'granted') {
        // 권한 허용 시 토큰 등록
        registerFcmToken();
      }
    } catch (error) {
      console.error('알림 권한 요청 중 오류:', error);
      setShowPermissionPrompt(false); // 오류 발생 시에도 숨김
    }
  }, [permissionStatus, registerFcmToken]); // registerFcmToken 의존성 추가

  return { permissionStatus, showPermissionPrompt, requestPermission };
}; 