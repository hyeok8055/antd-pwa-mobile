import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from 'react-google-button';
import { auth, db, checkDeviceCompatibility, getFCMToken, VAPID_KEY } from "../../firebaseconfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useDispatch } from 'react-redux';
import { setAuthStatus } from '../../redux/actions/authActions';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Modal, Button, Space, Image } from 'antd-mobile';

const GoogleLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // 디바이스 정보 확인
  useEffect(() => {
    const info = checkDeviceCompatibility();
    setDeviceInfo(info);

    // iOS 디바이스인 경우 알림 요청 모달 표시 여부 결정
    if (info?.isIOS) {
      // 알림 권한 상태 확인
      if (Notification.permission !== 'granted') {
        setShowNotificationModal(true);
      }
    }
  }, []);

  // 알림 권한 요청 함수
  const requestNotificationPermission = async () => {
    try {
      // iOS 16.4 미만 버전 확인
      if (deviceInfo?.isIOS && !deviceInfo?.isCompatibleIOS) {
        Modal.alert({
          content: 'iOS 16.4 버전 이상에서만 알림을 지원합니다. iOS를 업데이트해주세요.',
          confirmText: '확인',
        });
        setShowNotificationModal(false);
        return;
      }

      // 알림 권한 요청 및 FCM 토큰 발급
      const token = await getFCMToken(VAPID_KEY);
      
      if (token) {
        Modal.alert({
          content: '알림이 성공적으로 설정되었습니다!',
          confirmText: '확인',
        });
      } else {
        Modal.alert({
          content: '알림 설정에 실패했습니다. 브라우저 설정에서 알림을 허용해주세요.',
          confirmText: '확인',
        });
      }
      
      setShowNotificationModal(false);
    } catch (error) {
      console.error('알림 권한 요청 중 오류:', error);
      Modal.alert({
        content: '알림 설정 중 오류가 발생했습니다.',
        confirmText: '확인',
      });
      setShowNotificationModal(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 필요한 정보만 추출
      const serializedUser = {
        uid: user.uid,
        displayName: user.displayName || "익명 사용자",
        email: user.email || "이메일 없음",
        photoURL: user.photoURL || null, // 프로필 사진 URL
      };

      // Firestore에 사용자 정보 저장 또는 업데이트
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      const userData = {
          name: serializedUser.displayName,
          email: serializedUser.email,
          photoURL: serializedUser.photoURL,
          lastLoginAt: serverTimestamp(),
      };

      if (!userDoc.exists()) {
        userData.createdAt = serverTimestamp();
        userData.setupCompleted = false; // 새로운 사용자 표시
      }

      await setDoc(userRef, userData, { merge: true });

      // Redux에 인증 상태 저장
      dispatch(setAuthStatus(serializedUser));

      // 새 사용자면 인트로 페이지로, 기존 사용자면 메인 페이지로
      if (!userDoc.exists()) {
        navigate('/intro');
      } else {
        navigate('/main');
      }
    } catch (err) {
      console.error("Google 로그인 오류:", err);
    }
  };

  // iOS 알림 요청 모달
  const renderIOSNotificationModal = () => {
    return (
      <Modal
        visible={showNotificationModal}
        content={
          <div style={{ 
            padding: '10px 0', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center'
          }}>
            <Image
              src="/icons/notification-icon.png" 
              alt="알림 아이콘"
              width={80}
              height={80}
              style={{ 
                marginBottom: '20px', 
                borderRadius: '15px',
                border: '1px solid #eee'
              }}
              fallback="/icons/maskable_icon_x192.png"
            />
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              margin: '0 0 15px 0', 
              textAlign: 'center' 
            }}>
              알림 권한을 허용해주세요
            </h3>
            <p style={{ 
              fontSize: '14px', 
              lineHeight: '1.5', 
              margin: '0 0 10px 0', 
              color: '#666',
              textAlign: 'center'
            }}>
              중요 정보와 업데이트를 놓치지 않도록 푸시 알림을 활성화해주세요.
            </p>
            <p style={{ 
              fontSize: '14px', 
              lineHeight: '1.5', 
              margin: '0 0 20px 0', 
              color: '#666',
              textAlign: 'center'
            }}>
              iOS에서는 알림 권한을 허용해야 앱이 백그라운드에서도 알림을 받을 수 있습니다.
            </p>
          </div>
        }
        closeOnAction
        actions={[
          {
            key: 'cancel',
            text: '나중에',
            onClick: () => setShowNotificationModal(false)
          },
          {
            key: 'confirm',
            text: '알림 허용하기',
            bold: true,
            danger: false,
            onClick: requestNotificationPermission,
            style: {
              color: '#5FDD9D'
            }
          },
        ]}
      />
    );
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-md px-10 py-6 text-center w-96">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Google 로그인</h1>
        <p className="text-gray-600 mb-6">
          Google 계정을 사용해 손쉽게 로그인하세요!
        </p>
        <GoogleButton
          onClick={handleGoogleLogin}
          style={{ width: '100%', margin: '0 auto' }}
        />
      </div>

      {/* iOS 알림 권한 요청 모달 */}
      {renderIOSNotificationModal()}
    </div>
  );
};

export default GoogleLogin;
