import { useEffect } from 'react';
import { Modal } from 'antd-mobile';
import { Typography } from 'antd';

const { Text } = Typography;

export const useModal = (foodData, testMode = false) => {
  const calculateCalorieDifference = useCallback((mealType) => {
    if (!foodData || !foodData[mealType]) return null;
    
    const meal = foodData[mealType];
    if (!meal.actualCalories || !meal.estimatedCalories) return null;
    
    return meal.actualCalories - meal.estimatedCalories;
  }, [foodData]);

  const calculateSnackCalorieDifference = useCallback(() => {
    if (!foodData?.snacks) return null;
    
    const snacks = foodData.snacks;
    if (!snacks.actualCalories || !snacks.estimatedCalories) return null;
    
    return snacks.actualCalories - snacks.estimatedCalories;
  }, [foodData]);

  const showCalorieDifferenceModal = useCallback((mealType, includeSnacks = false) => {
    // 테스트 모드일 때는 기본값 표시
    if (testMode) {
      const testContent = (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            marginTop: '10px'
          }}>실제 섭취 칼로리와<br/>나의 예측의 차이는</div>
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
                color: 'rgb(22, 119, 255)',
                textAlign: 'center',
                width: '100%'
              }}
            >
              ±0kcal
            </Text>
          </div>
        </>
      );

      Modal.alert({
        title: '테스트 모드: 식사 결과',
        content: testContent,
        confirmText: '확인했습니다.',
      });
      return;
    }

    const difference = calculateCalorieDifference(mealType);
    if (difference === null) return;

    const isPositive = difference > 0;
    const absValue = Math.abs(difference).toFixed(2);

    let content = (
      <>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          marginTop: '10px'
        }}>실제 섭취 칼로리와 나의 예측의 차이는</div>
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
        const absSnackValue = Math.abs(snackDifference).toFixed(2);
        content = (
          <>
            {content}
            <div style={{ marginTop: '20px' }}>
              <div>간식의 실제 섭취 칼로리와 나의 예측의 차이는</div>
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
  }, [testMode, calculateCalorieDifference, calculateSnackCalorieDifference]);

  // 모달을 표시할 수 있는지 확인하는 함수
  const checkModalAvailable = useCallback(() => {
    if (testMode) return { available: true, mealType: 'lunch', includeSnacks: true };

    const now = new Date();
    const hours = now.getHours();

    let mealType = null;
    let includeSnacks = false;

    if (hours >= 7 && hours <= 9) {
      mealType = 'dinner';  // 전날 저녁 식사 결과
      includeSnacks = true; // 전날 간식도 함께 표시
    } else if (hours >= 11 && hours <= 12) {
      mealType = 'breakfast';  // 아침 식사 결과
    } else if (hours >= 17 && hours <= 18) {
      mealType = 'lunch';  // 점심 식사 결과
    }

    // 해당 시간대에 표시할 식사 데이터가 있는지 확인
    const hasData = mealType && foodData?.[mealType] && 
      (foodData[mealType].actualCalories !== undefined && 
       foodData[mealType].estimatedCalories !== undefined);
    
    // 간식 데이터 확인 (저녁 식사 결과와 함께 표시되는 경우)
    const hasSnackData = includeSnacks && foodData?.snacks && 
      (foodData.snacks.actualCalories !== undefined && 
       foodData.snacks.estimatedCalories !== undefined);

    return { 
      available: hasData || (includeSnacks && hasSnackData), 
      mealType, 
      includeSnacks
    };
  }, [foodData, testMode]);

  // 모달을 표시하는 함수
  const showModal = useCallback(() => {
    const { available, mealType, includeSnacks } = checkModalAvailable();
    
    if (testMode) {
      showCalorieDifferenceModal(mealType, includeSnacks);
      return;
    }
    
    if (available && mealType) {
      showCalorieDifferenceModal(mealType, includeSnacks);
    } else {
      // 조회 가능한 시간이 아니거나 식사 기록이 없는 경우
      const now = new Date();
      const hours = now.getHours();
      
      let message = '';
      
      // 시간대 확인
      if (hours < 7 || (hours > 9 && hours < 11) || (hours > 12 && hours < 17) || hours > 18) {
        message = (
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 16, lineHeight: 1.5 }}>
              현재는 이전 식사 결과를 조회할 수 있는 시간이 아닙니다.
            </Text>
            <br />
            <br />
            <Text strong style={{ fontSize: 15, color: '#333', lineHeight: 1.5, marginTop: '10px' }}>
              조회 가능 시간:
            </Text>
            <br />
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 1.8 }}>
              - 아침 식사 결과: 오전 11시 ~ 12시<br />
              - 점심 식사 결과: 오후 5시 ~ 6시<br />
              - 저녁/간식 결과: 오전 7시 ~ 9시
            </Text>
          </div>
        );
      } else {
        // 시간은 맞지만 데이터가 없는 경우
        const messageStyle = { 
          fontSize: 16, 
          textAlign: 'center', 
          lineHeight: 1.5 
        };
        
        if (hours >= 7 && hours <= 9) {
          message = <Text style={messageStyle}>어제 저녁 식사 또는 간식 기록이 없습니다.</Text>;
        } else if (hours >= 11 && hours <= 12) {
          message = <Text style={messageStyle}>아침 식사 기록이 없습니다.</Text>;
        } else if (hours >= 17 && hours <= 18) {
          message = <Text style={messageStyle}>점심 식사 기록이 없습니다.</Text>;
        }
      }
      
      Modal.alert({
        title: '식사 결과 조회 불가',
        content: message,
        confirmText: '확인',
      });
    }
  }, [checkModalAvailable, showCalorieDifferenceModal, testMode]);

  return {
    showModal,
    isModalAvailable: checkModalAvailable().available
  };
};