import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'antd-mobile';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, getFCMToken } from '../firebaseconfig';

const NotificationPermissionModal = () => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // PWA로 실행 중인지 확인
    const isPWA = window.navigator.standalone || 
                 window.matchMedia('(display-mode: standalone)').matches;
    
    // 알림 권한이 아직 요청되지 않았는지 확인
    const notificationNotAsked = Notification.permission === 'default';
    
    // PWA로 실행 중이고 알림 권한이 아직 요청되지 않았으면 모달 표시
    if (isPWA && notificationNotAsked) {
      // 바로 표시하지 않고 약간 지연시켜 앱이 로드된 후 표시
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleRequestPermission = async () => {
    try {
      console.log('알림 권한 요청 시작');
      const permission = await Notification.requestPermission();
      console.log('알림 권한 결과:', permission);
      
      if (permission === 'granted') {
        // 권한 허용 시 FCM 토큰 획득
        const token = await getFCMToken('BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk');
        
        // Firestore에 토큰 저장
        if (auth.currentUser && token) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            fcmToken: token,
            platform: 'iOS',
            notificationEnabled: true
          }, { merge: true });
        }
        
        // 테스트 알림 표시
        new Notification('알림이 활성화되었습니다', {
          body: '이제 중요한 식사 결과와 정보를 받을 수 있습니다.',
          icon: '/icons/apple-touch-icon-152x152.png'
        });
      }
      
      // 권한 응답 상태와 관계없이 모달 닫기
      setVisible(false);
    } catch (error) {
      console.error('알림 권한 요청 오류:', error);
      setVisible(false);
    }
  };
  
  const handleClose = () => {
    setVisible(false);
    // 거부 상태를 저장해서 다시 표시하지 않게 할 수도 있음
    localStorage.setItem('notificationPromptDismissed', 'true');
  };
  
  return (
    <Modal
      visible={visible}
      title="식사 결과 알림 받기"
      content={
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: '12px', textAlign: 'center' }}>
            <img 
              src="/icons/notification-icon.png" 
              alt="알림" 
              style={{ width: '64px', height: '64px', margin: '0 auto 16px' }}
            />
          </div>
          <p style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '16px' }}>
            Calorie Sync는 사용자의 식사 결과와 칼로리 예측 정보를 알림으로 제공합니다.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
            식사 시간에 맞춰 칼로리 예측 결과를 놓치지 않도록 알림을 활성화해 보세요.
          </p>
        </div>
      }
      closeOnAction
      onClose={handleClose}
      actions={[
        {
          key: 'cancel',
          text: '나중에 설정하기',
          onClick: handleClose
        },
        {
          key: 'confirm',
          text: '알림 받기에 동의합니다',
          bold: true,
          danger: false,
          color: 'primary',
          onClick: handleRequestPermission
        }
      ]}
    />
  );
};

export default NotificationPermissionModal; 