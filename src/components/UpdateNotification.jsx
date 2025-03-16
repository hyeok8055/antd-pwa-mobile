import React, { useEffect, useState } from 'react';
import { Button, Popup, Space, Toast } from 'antd-mobile';

const UpdateNotification = () => {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // 서비스 워커 이벤트 등록
    if ('serviceWorker' in navigator) {
      // 서비스 워커가 업데이트되었을 때 발생하는 이벤트를 확인
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // 이미 새로고침 중인지 확인하는 플래그
        if (newVersionAvailable) return;
        setNewVersionAvailable(true);
        setShowPopup(true);
      });

      // 서비스 워커 업데이트 확인하는 간격 설정 (1시간마다)
      const checkInterval = setInterval(checkForUpdates, 60 * 60 * 1000);
      
      // 초기 로드 시 한 번 확인
      checkForUpdates();
      
      return () => clearInterval(checkInterval);
    }
  }, [newVersionAvailable]);

  // 서비스 워커 업데이트 확인 함수
  const checkForUpdates = () => {
    if (!navigator.serviceWorker.controller) return;

    // 업데이트 확인을 위해 서비스 워커 재등록
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        // 업데이트 체크
        registration.update().catch(err => {
          console.error('서비스 워커 업데이트 확인 중 오류:', err);
        });
      }
    });
  };

  // 앱 업데이트 함수
  const updateApp = () => {
    Toast.show({
      content: '업데이트 중...',
      duration: 1500,
    });

    // 페이지 새로고침으로 새 버전 적용
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // 사이드 메뉴에서 수동으로 업데이트 체크 트리거하는 함수
  const checkForUpdateManually = () => {
    Toast.show({
      content: '업데이트 확인 중...',
      duration: 1500,
    });
    
    checkForUpdates();
    
    // 만약 서비스 워커가 새 버전을 발견하면 controllerchange 이벤트가 발생하고
    // 팝업이 표시됩니다. 그렇지 않으면 최신 버전임을 알립니다.
    setTimeout(() => {
      if (!newVersionAvailable) {
        Toast.show({
          content: '이미 최신 버전입니다',
          duration: 2000,
        });
      }
    }, 2000);
  };

  return (
    <>
      {/* 업데이트 알림 팝업 */}
      <Popup
        visible={showPopup}
        onMaskClick={() => setShowPopup(false)}
        bodyStyle={{ 
          padding: '20px 16px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px' 
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h3>새 버전이 있습니다</h3>
          <p>앱의 새 버전을 사용할 수 있습니다. 지금 업데이트하시겠습니까?</p>
          <Space direction="vertical" style={{ width: '100%', marginTop: '16px' }}>
            <Button color="primary" block onClick={updateApp}>
              지금 업데이트
            </Button>
            <Button block onClick={() => setShowPopup(false)}>
              나중에
            </Button>
          </Space>
        </div>
      </Popup>
    </>
  );
};

// 수동 업데이트 체크 함수를 외부로 내보냅니다
export const checkForUpdateManually = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    Toast.show({
      content: '업데이트 확인 중...',
      duration: 1500,
    });

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update()
          .then(() => {
            // 업데이트가 있는지 확인하기 위해 잠시 대기
            setTimeout(() => {
              Toast.show({
                content: '이미 최신 버전입니다',
                duration: 2000,
              });
            }, 2000);
          })
          .catch(err => {
            console.error('서비스 워커 업데이트 확인 중 오류:', err);
            Toast.show({
              content: '업데이트 확인 중 오류가 발생했습니다',
              duration: 2000,
            });
          });
      }
    });
  } else {
    Toast.show({
      content: '서비스 워커가 활성화되지 않았습니다',
      duration: 2000,
    });
  }
};

export default UpdateNotification; 