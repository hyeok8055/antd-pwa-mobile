import { useState, useEffect } from 'react';

const checkDeviceCompatibility = () => {
  // iOS 기기 체크
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // 안드로이드 기기 체크
  const isAndroid = /Android/i.test(navigator.userAgent);

  // iOS 버전 체크 (iOS 16.4+ 필요)
  let isCompatibleIOS = false;
  if (isIOS) {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      const version = [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3] || 0, 10)
      ];
      // iOS 16.4 이상
      isCompatibleIOS = version[0] >= 16 && version[1] >= 4;
    }
  }

  // PWA 모드 체크
  const isPWA = typeof window !== 'undefined' && 
                (window.matchMedia('(display-mode: standalone)').matches || 
                (isIOS && window.navigator.standalone));

  // 안드로이드 PWA 체크
  const isAndroidPWA = isAndroid && isPWA;
  
  // Safari 브라우저 체크
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return {
    isIOS,
    isCompatibleIOS,
    isSafari,
    isAndroid,
    isPWA,
    isAndroidPWA,
    isIOSPWA: isIOS && isPWA,
    isCompatible: !isIOS || isCompatibleIOS,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  };
};

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 내부 함수 사용
      const info = checkDeviceCompatibility();
      setDeviceInfo(info);
      console.log('디바이스 호환성 정보 (hook):', info);

      // PWA 모드 로그
      if (info.isIOSPWA) {
        console.log('iOS PWA 모드로 실행 중 (hook)');
      }
      
      if (info.isAndroidPWA) {
        console.log('Android PWA 모드로 실행 중 (hook)');
      }

      // 첫 실행 감지 로직
      const hasRunBefore = localStorage.getItem('pwa_has_run_before');
      if (!hasRunBefore) {
        console.log('앱 첫 실행 감지 (hook)');
        localStorage.setItem('pwa_has_run_before', 'true');
        // 첫 실행 관련 로직 추가 가능
      }
    }
  }, []); // 마운트 시 한 번만 실행

  return deviceInfo;
}; 