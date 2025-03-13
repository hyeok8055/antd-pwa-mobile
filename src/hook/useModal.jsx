import { useEffect, useCallback } from 'react';
import { Modal } from 'antd-mobile';
import { Typography } from 'antd';

const { Text } = Typography;

export const useModal = (foodData) => {
  useEffect(() => {
    const calculateCalorieDifference = (mealType) => {
      if (!foodData || !foodData[mealType]) return null;
      
      const meal = foodData[mealType];
      if (!meal.actualCalories || !meal.estimatedCalories) return null;
      
      return meal.actualCalories - meal.estimatedCalories;
    };

    const calculateSnackCalorieDifference = () => {
      if (!foodData?.snacks) return null;
      
      const snacks = foodData.snacks;
      if (!snacks.actualCalories || !snacks.estimatedCalories) return null;
      
      return snacks.actualCalories - snacks.estimatedCalories;
    };

    const showCalorieDifferenceModal = (mealType, includeSnacks = false) => {
      const difference = calculateCalorieDifference(mealType);
      if (difference === null) return;

      const isPositive = difference > 0;
      const absValue = Math.abs(difference);

      let content = (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            marginTop: '10px'
          }}>칼로리 예측 편차는</div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            marginTop: '10px'
          }}>
            <Text 
              style={{ 
                fontSize: '30px', 
                fontWeight: '900', 
                fontFamily: 'Pretendard-900', 
                color: isPositive ? 'red' : 'rgb(22, 119, 255)',
                textAlign: 'center',
                width: '100%'
              }}
            >
              {isPositive ? '+' : '-'}{absValue}kcal
            </Text>
          </div>
        </>
      );

      // 저녁 식사와 함께 간식 정보 표시
      if (includeSnacks) {
        const snackDifference = calculateSnackCalorieDifference();
        if (snackDifference !== null) {
          const isSnackPositive = snackDifference > 0;
          const absSnackValue = Math.abs(snackDifference);
          content = (
            <>
              {content}
              <div style={{ marginTop: '20px' }}>
                <div>예측대비 편차는</div>
                <Text 
                  style={{ 
                    fontSize: '30px', 
                    fontWeight: '900', 
                    fontFamily: 'Pretendard-900', 
                    color: isSnackPositive ? 'red' : 'rgb(22, 119, 255)'
                  }}
                >
                  {isSnackPositive ? '+' : '-'}{absSnackValue}kcal
                </Text>
              </div>
            </>
          );
        }
      }

      Modal.alert({
        title: `${mealType === 'dinner' ? '어제' : '지난'} ${
          mealType === 'breakfast' ? '아침' : 
          mealType === 'lunch' ? '점심' : '저녁'
        } 식사 결과`,
        content: content,
        confirmText: '확인했습니다.',
      });
    };

    const checkTimeAndShowModal = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = hours * 60 + minutes;
      const currentTimeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      
      const lastShownKey = 'lastShownModalDate';
      const lastShownDate = localStorage.getItem(lastShownKey);
      
      const morningStart = 7 * 60; // 7:00
      const morningEnd = 9 * 60;   // 9:00
      const eveningStart = 17 * 60; // 17:00
      const eveningEnd = 18 * 60;   // 18:00

      let mealType = null;
      let includeSnacks = false;

      if (currentTime >= morningStart && currentTime <= morningEnd) {
        mealType = 'dinner';  // 전날 저녁 식사 결과
        includeSnacks = true; // 전날 간식도 함께 표시
      } else if (currentTime >= 11 * 60 && currentTime <= 12 * 60) {
        mealType = 'breakfast';  // 아침 식사 결과
      } else if (currentTime >= eveningStart && currentTime <= eveningEnd) {
        mealType = 'lunch';  // 점심 식사 결과
      }

      // 오늘 이미 모달을 표시했다면 표시하지 않음
      if (lastShownDate === currentTimeStr) {
        return;
      }

      if (mealType && foodData?.[mealType]) {
        showCalorieDifferenceModal(mealType, includeSnacks);
        localStorage.setItem(lastShownKey, currentTimeStr);
      }
    };

    // 5분마다 시간을 체크 (300000ms = 5분)
    const intervalId = setInterval(checkTimeAndShowModal, 300000);
    checkTimeAndShowModal(); // 초기 실행

    return () => clearInterval(intervalId);
  }, [foodData]);
};