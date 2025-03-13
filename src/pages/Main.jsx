import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Button } from 'antd';
import { Modal, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useSelector } from 'react-redux';
import { useFood } from '@/hook/useFood';
import { useModal } from '@/hook/useModal';
import { BellOutline } from 'antd-mobile-icons';

import { CheckCircleTwoTone, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Main = () => {
  const today = dayjs();
  const uid = useSelector((state) => state.auth.user?.uid);
  const { foodData, loading, error } = useFood(uid);
  const [mealFlags, setMealFlags] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const [timeRestrictions, setTimeRestrictions] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const navigate = useNavigate();

  const { showModal, isModalAvailable } = useModal(foodData, false);

  useEffect(() => {
    if (foodData) {
      setMealFlags({
        breakfast: foodData.breakfast?.flag === 1,
        lunch: foodData.lunch?.flag === 1,
        dinner: foodData.dinner?.flag === 1,
        snack: foodData.snacks?.foods?.length > 0,
      });
    }
  }, [foodData]);

  // 시간 제한 확인을 위한 useEffect
  useEffect(() => {
    const checkTimeRestrictions = () => {
      const currentHour = new Date().getHours(); // 24시간 형식 (0-23)
      console.log('현재 시간(시, 24시간 형식):', currentHour);
      
      // 시간 제한 로직 (24시간 형식 기준)
      // 아침식사: 11시(오전 11시) 이후 제한
      // 점심식사: 12시(오후 12시) 이전 및 17시(오후 5시) 이후 제한
      // 저녁식사: 7시(오전 7시)부터 19시(오후 7시) 사이 제한
      const isDinnerRestricted = currentHour >= 7 && currentHour < 19;
      const isLunchRestricted = currentHour < 12 || currentHour >= 17;
      
      setTimeRestrictions({
        breakfast: currentHour >= 11, // 11시(오전 11시) 이후 아침식사 제한
        lunch: isLunchRestricted, // 12시(오후 12시) 이전 및 17시(오후 5시) 이후 점심식사 제한
        dinner: isDinnerRestricted, // 7시(오전 7시)부터 19시(오후 7시) 사이 저녁식사 제한
        snack: false, // 간식은 제한 없음
      });
      console.log('시간 제한 상태:', {
        breakfast: currentHour >= 11,
        lunch: isLunchRestricted,
        dinner: isDinnerRestricted,
        snack: false
      });
    };

    checkTimeRestrictions();
    const intervalId = setInterval(checkTimeRestrictions, 60000); // 1분마다 시간 제한 확인

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const handleMealClick = (mealType) => {
    navigate(`/meals/${mealType}`);
  };

  // 시간 제한 메시지 반환 함수
  const getTimeRestrictionMessage = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return '11시(오전 11시) 이후에는 기록할 수 없습니다';
      case 'lunch':
        const currentHour = new Date().getHours();
        return currentHour < 12 
          ? '12시(오후 12시) 이후부터 기록할 수 있습니다' 
          : '17시(오후 5시) 이후에는 기록할 수 없습니다';
      case 'dinner':
        return '7시(오전 7시)부터 19시(오후 7시) 사이에는 기록할 수 없습니다';
      default:
        return '';
    }
  };

  return (
    <div className="h-[100%] bg-bg1 p-4 rounded-md shadow-md">
      <Row justify="center" style={{ marginBottom: 20 }}>
        <Text style={{ color: "#5FDD9D", letterSpacing: '1px', fontSize: '28px', fontWeight: '800', fontFamily: 'Pretendard-800'}}>
          일일 칼로리 기록
        </Text>
      </Row>

      <Row justify="center" style={{ margin: '8px 0 8px 0' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '24px', fontWeight: '700', fontFamily: 'Pretendard-700'}}>
        {new Date()
          .toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\.$/, "")}
        </Text>
      </Row>
      <Row justify="center" style={{ marginBottom: '20px' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '18px', fontWeight: '500', fontFamily: 'Pretendard-500'}}>
        {new Date().toLocaleDateString("ko-KR", { weekday: "long" })}
        </Text>
      </Row>
      
      <Row justify="center" style={{ marginBottom: '20px' }}>
        <div 
          onClick={isModalAvailable ? showModal : undefined}
          style={{ 
            position: 'relative', 
            cursor: isModalAvailable ? 'pointer' : 'not-allowed',
            opacity: isModalAvailable ? 1 : 0.5
          }}
        >
          <BellOutline style={{ fontSize: '28px' }} />
          {isModalAvailable && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8px',
              height: '8px',
              backgroundColor: 'red',
              borderRadius: '50%'
            }} />
          )}
        </div>
      </Row>

      <Row gutter={[16, 24]} justify="center">
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('breakfast')}
            disabled={mealFlags.breakfast || timeRestrictions.breakfast}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${(mealFlags.breakfast || timeRestrictions.breakfast) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700', position: 'relative' }}
          >
            아침식사 기록하기
            {mealFlags.breakfast && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
            {!mealFlags.breakfast && timeRestrictions.breakfast && (
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>{getTimeRestrictionMessage('breakfast')}</Text>
              </div>
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('lunch')}
            disabled={mealFlags.lunch || timeRestrictions.lunch}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${(mealFlags.lunch || timeRestrictions.lunch) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700', position: 'relative' }}
          >
            점심식사 기록하기
            {mealFlags.lunch && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
            {!mealFlags.lunch && timeRestrictions.lunch && (
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>{getTimeRestrictionMessage('lunch')}</Text>
              </div>
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('dinner')}
            disabled={mealFlags.dinner || timeRestrictions.dinner}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${(mealFlags.dinner || timeRestrictions.dinner) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700', position: 'relative' }}
          >
            저녁식사 기록하기
            {mealFlags.dinner && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
            {!mealFlags.dinner && timeRestrictions.dinner && (
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>{getTimeRestrictionMessage('dinner')}</Text>
              </div>
            )}
          </Button>
        </Col>
        <Col span={20}>
          <Button
            onClick={() => handleMealClick('snack')}
            disabled={mealFlags.snack}
            className={`w-full bg-bg1 rounded-xl shadow-md p-0 relative ${mealFlags.snack ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ height: '60px', textAlign: 'left', fontFamily: 'Pretendard-700', position: 'relative' }}
          >
            간식 기록하기
            {mealFlags.snack && (
              <CheckCircleTwoTone
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: 36 }}
              />
            )}
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default Main; 