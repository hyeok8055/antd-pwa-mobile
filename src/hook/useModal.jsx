import { useCallback } from 'react';
import { Modal } from 'antd-mobile';
import { Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

// // 칼로리 편차 모달을 직접 표시하는 함수를 외부에서도 사용할 수 있도록 export
// export const showTestCalorieDifferenceModal = (mealType, mealData) => {
//   const difference = mealData.actualCalories - mealData.estimatedCalories;
//   const isPositive = difference > 0;
//   const absValue = Math.abs(difference).toFixed(0);
  
//   // 편차에 따른 색상과 설명 텍스트 설정
//   const differenceColor = isPositive ? '#ff4d4f' : '#1677ff';
//   const differenceText = isPositive 
//     ? '예측보다 더 많이 섭취했습니다'
//     : difference < 0 
//       ? '예측보다 더 적게 섭취했습니다' 
//       : '예측과 동일하게 섭취했습니다';
  
//   // 편차에 따른 배경색 설정 (더 부드러운 톤)
//   const backgroundColor = isPositive 
//     ? 'rgba(255, 77, 79, 0.08)' 
//     : difference < 0 
//       ? 'rgba(22, 119, 255, 0.08)' 
//       : '#f8f8f8';

//   let content = (
//     <>
//       <div style={{ 
//         display: 'flex', 
//         flexDirection: 'column',
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         width: '100%',
//         marginTop: '15px'
//       }}>
//         <Text style={{ 
//           fontSize: '18px', 
//           textAlign: 'center', 
//           marginBottom: '15px',
//           color: differenceColor,
//           fontWeight: '600'
//         }}>
//           {differenceText}
//         </Text>
        
//         {/* 편차 표시 패널 */}
//         <div style={{
//           backgroundColor: backgroundColor,
//           borderRadius: '10px',
//           padding: '15px 20px',
//           width: '90%',
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//           boxShadow: isPositive || difference < 0 ? `0 2px 8px ${differenceColor}20` : 'none'
//         }}>
//           <Text 
//             style={{ 
//               fontSize: '24px', 
//               fontWeight: '700', 
//               color: differenceColor,
//               display: 'flex',
//               alignItems: 'center'
//             }}
//           >
//             {isPositive ? (
//               <ArrowUpOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
//             ) : difference < 0 ? (
//               <ArrowDownOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
//             ) : null}
//             {isPositive ? '+' : difference < 0 ? '-' : '±'}{absValue}kcal
//           </Text>
//         </div>
//       </div>
//     </>
//   );

//   try {
//     Modal.alert({
//       title: `${
//         mealType === 'breakfast' ? '아침' : 
//         mealType === 'lunch' ? '점심' : '저녁'
//       } 식사 결과 (테스트)`,
//       content: content,
//       confirmText: '확인했습니다.',
//     });
//   } catch (error) {
//     console.error('모달 표시 중 오류 발생:', error);
//     alert('모달 표시 중 오류가 발생했습니다.');
//   }
// };

export const useModal = (foodData, testMode = false) => {
  const calculateCalorieDifference = useCallback((mealType) => {
    if (!foodData || !foodData[mealType]) return null;
    
    const meal = foodData[mealType];
    // estimatedCalories 또는 actualCalories 가 null 또는 undefined 이면 계산 불가
    if (meal.actualCalories === null || meal.estimatedCalories === null || meal.actualCalories === undefined || meal.estimatedCalories === undefined) return null;
    
    const originalDifference = meal.actualCalories - meal.estimatedCalories;
    // meal.offset 값이 숫자 형태(0 포함)로 존재하면 사용, 아니면 0으로 간주
    const offset = (typeof meal.offset === 'number') ? meal.offset : 0; 

    // 최종 차이 = 원본 차이 + offset
    return originalDifference + offset; 

  }, [foodData]);

  // 필요에 따라 원본 차이만 반환하는 함수도 추가 가능
  const getOriginalCalorieDifference = useCallback((mealType) => {
      if (!foodData || !foodData[mealType]) return null;
      const meal = foodData[mealType];
      if (meal.actualCalories === null || meal.estimatedCalories === null || meal.actualCalories === undefined || meal.estimatedCalories === undefined) return null;
      return meal.actualCalories - meal.estimatedCalories;
  }, [foodData]);

   // offset 값만 반환하는 함수
   const getMealOffset = useCallback((mealType) => {
       if (!foodData || !foodData[mealType]) return null;
       const meal = foodData[mealType];
       return (typeof meal.offset === 'number') ? meal.offset : 0;
   }, [foodData]);

  const showCalorieDifferenceModal = useCallback((mealType) => {
    // 테스트 모드일 때는 기본값 표시
    if (testMode) {
      const testContent = (
        <>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            marginTop: '10px'
          }}>
            <Text style={{ 
              fontSize: '18px', 
              textAlign: 'center', 
              marginBottom: '15px',
              color: '#888',
              fontWeight: '600' 
            }}>
              예측과 실제 섭취 칼로리가 동일합니다
            </Text>
            <div style={{
              backgroundColor: '#f8f8f8',
              borderRadius: '10px',
              padding: '15px 20px',
              width: '90%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text 
                style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ±0kcal
              </Text>
            </div>
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

    // 실제 데이터 확인
    const difference = calculateCalorieDifference(mealType);
    
    // 차이가 null이면 기본 메시지 표시
    if (difference === null) {
      Modal.alert({
        title: '데이터 없음',
        content: '해당 식사의 칼로리 데이터가 없습니다.',
        confirmText: '확인',
      });
      return;
    }

    const isPositive = difference > 0;
    const absValue = Math.abs(difference).toFixed(0);
    
    // 편차에 따른 색상과 설명 텍스트 설정
    const differenceColor = isPositive ? '#ff4d4f' : '#1677ff';
    const differenceText = isPositive 
      ? '예측보다 더 많이 섭취했습니다'
      : difference < 0 
        ? '예측보다 더 적게 섭취했습니다' 
        : '예측과 동일하게 섭취했습니다';
    
    // 편차에 따른 배경색 설정 (더 부드러운 톤)
    const backgroundColor = isPositive 
      ? 'rgba(255, 77, 79, 0.08)' 
      : difference < 0 
        ? 'rgba(22, 119, 255, 0.08)' 
        : '#f8f8f8';

    let content = (
      <>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          marginTop: '15px'
        }}>
          <Text style={{ 
            fontSize: '18px', 
            textAlign: 'center', 
            marginBottom: '15px',
            color: differenceColor,
            fontWeight: '600'
          }}>
            {differenceText}
          </Text>
          
          {/* 편차 표시 패널 */}
          <div style={{
            backgroundColor: backgroundColor,
            borderRadius: '10px',
            padding: '15px 20px',
            width: '90%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: isPositive || difference < 0 ? `0 2px 8px ${differenceColor}20` : 'none'
          }}>
            <Text 
              style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: differenceColor,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isPositive ? (
                <ArrowUpOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
              ) : difference < 0 ? (
                <ArrowDownOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
              ) : null}
              {isPositive ? '+' : difference < 0 ? '-' : '±'}{absValue}kcal
            </Text>
          </div>
        </div>
      </>
    );

    try {
      Modal.alert({
        title: `${mealType === 'dinner' ? '어제' : '지난'} ${
          mealType === 'breakfast' ? '아침' : 
          mealType === 'lunch' ? '점심' : '저녁'
        } 식사 결과`,
        content: content,
        confirmText: '확인했습니다.',
      });
    } catch (error) {
      console.error('모달 표시 중 오류 발생:', error);
      // 기본 alert로 대체
      alert('식사 결과를 확인할 수 없습니다. 오류가 발생했습니다.');
    }
  }, [testMode, calculateCalorieDifference, foodData]);

  // 모달을 표시할 수 있는지 확인하는 함수
  const checkModalAvailable = useCallback(() => {
    if (testMode) return { available: true, mealType: 'lunch' };

    const now = new Date();
    const hours = now.getHours();

    let mealType = null;

    // 새로운 시간 기준으로 수정
    if (hours >= 6 && hours <= 10) {
      mealType = 'dinner';  // 전날 저녁 식사 결과
    } else if (hours >= 11 && hours <= 14) {
      mealType = 'breakfast';  // 아침 식사 결과
    } else if (hours >= 17 && hours <= 20) {
      mealType = 'lunch';  // 점심 식사 결과
    }

    // 해당 시간대에 표시할 식사 데이터가 있는지 확인
    const hasData = mealType && foodData?.[mealType] && 
      (foodData[mealType].actualCalories !== undefined && 
       foodData[mealType].estimatedCalories !== undefined);

    return { 
      available: hasData, 
      mealType,
      isValidTime: mealType !== null // 유효한 시간대인지 여부
    };
  }, [foodData, testMode]);

  // 모달을 표시하는 함수
  const showModal = useCallback(() => {
    const modalInfo = checkModalAvailable();
    
    const { available, mealType, isValidTime } = modalInfo;
    
    if (testMode) {
      showCalorieDifferenceModal(mealType);
      return;
    }
    
    if (available && mealType) {
      showCalorieDifferenceModal(mealType);
    } else {
      // 조회 가능한 시간이 아니거나 식사 기록이 없는 경우
      const now = new Date();
      const hours = now.getHours();
      
      let message = '';
      
      // 시간대 확인
      if (!isValidTime) {
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
              - 아침 식사 결과: 오전 11시 ~ 오후 2시<br />
              - 점심 식사 결과: 오후 5시 ~ 오후 8시<br />
              - 저녁 식사 결과: 오전 6시 ~ 오전 10시
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
        
        if (hours >= 6 && hours <= 10) {
          message = <Text style={messageStyle}>어제 저녁 식사 기록이 없습니다.</Text>;
        } else if (hours >= 11 && hours <= 14) {
          message = <Text style={messageStyle}>아침 식사 기록이 없습니다.</Text>;
        } else if (hours >= 17 && hours <= 20) {
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
    isModalAvailable: checkModalAvailable().available,
    calculateCalorieDifference,
    getOriginalCalorieDifference,
    getMealOffset
  };
};