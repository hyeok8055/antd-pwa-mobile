import { useState, useEffect } from 'react';

export const usePwaInstall = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
      console.log('PWA 설치 가능 (hook): beforeinstallprompt 이벤트 발생');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []); // 마운트 시 한 번만 실행

  const installPwa = async () => {
    if (!deferredPrompt) {
      console.log('설치 프롬프트가 없습니다 (hook)');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`사용자 선택 (hook): ${outcome}`);

    // 프롬프트가 사용되었으므로 상태 초기화
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  return { showInstallPrompt, installPwa };
}; 