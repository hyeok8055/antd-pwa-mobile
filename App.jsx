import React, { useEffect } from 'react';
import { getFCMToken, onMessageListener } from '../firebaseconfig';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../contexts/FirestoreContext';

const App = () => {
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        if (!('Notification' in window)) {
          console.log('이 브라우저는 알림을 지원하지 않습니다');
          return;
        }

        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
          console.log('알림 권한 요청 결과:', permission);
        }

        if (permission === 'granted') {
          const token = await getFCMToken('BBOl7JOGCasgyKCZv1Atq_5MdnvWAWk_iWleIggXfXN3aMGJeuKdEHSTp4OGUfmVPNHwnf5eCLQyY80ITKzz7qk');
          
          if (token && auth.currentUser) {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
              fcmToken: token
            }, { merge: true });
          }

          onMessageListener().then((payload) => {
            console.log('포어그라운드 메시지 수신됨:', payload);
            
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/logo.png',
              badge: '/logo.png'
            });
          }).catch(err => console.error('메시지 수신 오류:', err));
        }
      } catch (error) {
        console.error('알림 설정 중 오류 발생:', error);
      }
    };

    setupNotifications();
  }, [auth, db]);

  return (
    <div>
      {/* 기존 코드 유지 */}
    </div>
  );
};

export default App; 