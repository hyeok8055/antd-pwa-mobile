import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Button } from 'antd';
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

  const { showModal, isModalAvailable } = useModal(foodData);

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
      // 아침식사: 09시부터 11시까지 기록 가능
      // 점심식사: 12시부터 17시까지 기록 가능
      // 저녁식사: 18시부터 23시59분까지 기록 가능
      
      setTimeRestrictions({
        breakfast: currentHour < 9 || currentHour > 11, // 9시부터 11시까지만 아침식사 가능
        lunch: currentHour < 12 || currentHour > 17, // 12시부터 17시까지만 점심식사 가능
        dinner: currentHour < 18, // 18시부터 23시59분까지만 저녁식사 가능
        snack: false, // 간식은 제한 없음
      });
      console.log('시간 제한 상태:', {
        breakfast: currentHour < 9 || currentHour > 11,
        lunch: currentHour < 12 || currentHour > 17,
        dinner: currentHour < 18,
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
        return '09시부터 11시까지만 기록 가능합니다';
      case 'lunch':
        return '12시부터 17시까지만 기록 가능합니다';
      case 'dinner':
        return '18시부터 23시59분까지만 기록 가능합니다';
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
      
      <Row justify="center" style={{ marginBottom: '15px' }}>
        <div 
          onClick={showModal}
          style={{ 
            position: 'relative', 
            cursor: 'pointer',
            padding: '10px'  // 클릭 영역 확장
          }}
        >
          <BellOutline style={{ fontSize: '32px' }} />
          {isModalAvailable && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '12px',
              height: '12px',
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