import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Button, Card, Progress, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { useSelector } from 'react-redux';
import { useFood } from '@/hook/useFood';
import { useModal } from '@/hook/useModal';
// import { showTestCalorieDifferenceModal } from '@/hook/useModal';
import { BellOutline } from 'antd-mobile-icons';
import { 
  CheckCircleTwoTone, 
  ClockCircleOutlined, 
  CoffeeOutlined, 
  FireOutlined,
  HistoryOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

// 테스트용 더미 데이터
const TEST_DATA = {
  moreCase: {
    actualCalories: 750,
    estimatedCalories: 500,
  },
  lessCase: {
    actualCalories: 400,
    estimatedCalories: 600,
  },
  sameCase: {
    actualCalories: 500,
    estimatedCalories: 500,
  }
};

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
  const [currentTimeCategory, setCurrentTimeCategory] = useState('');
  const navigate = useNavigate();

  const { showModal, isModalAvailable } = useModal(foodData);

  // // 테스트 모달 표시 함수
  // const showTestModals = () => {
  //   // 더 많이 먹은 경우
  //   setTimeout(() => {
  //     showTestCalorieDifferenceModal('breakfast', TEST_DATA.moreCase);
      
  //     // 더 적게 먹은 경우
  //     setTimeout(() => {
  //       showTestCalorieDifferenceModal('lunch', TEST_DATA.lessCase);
        
  //       // 동일하게 먹은 경우
  //       setTimeout(() => {
  //         showTestCalorieDifferenceModal('dinner', TEST_DATA.sameCase);
  //       }, 2000);
  //     }, 2000);
  //   }, 500);
  // };

  useEffect(() => {
    if (foodData) {
      setMealFlags({
        breakfast: foodData.breakfast?.flag === 1,
        lunch: foodData.lunch?.flag === 1,
        dinner: foodData.dinner?.flag === 1,
        // 간식은 여러번 기록 가능하므로 플래그 대신 오늘 날짜에 이미 기록했는지로 판단
        snack: false, // 언제든지 기록 가능하도록 항상 false로 설정
      });
    }
  }, [foodData]);

  // 시간 제한 확인을 위한 useEffect
  useEffect(() => {
    const checkTimeRestrictions = () => {
      const currentHour = new Date().getHours(); // 24시간 형식 (0-23)
      
      // 시간 제한 로직 (24시간 형식 기준)
      // 아침식사: 06시부터 11시59분까지 기록 가능
      // 점심식사: 12시부터 17시59분까지 기록 가능
      // 저녁식사: 18시부터 23시59분까지 기록 가능
      
      // 현재 시간대 카테고리 설정
      if (currentHour >= 6 && currentHour < 12) {
        setCurrentTimeCategory('아침');
      } else if (currentHour >= 12 && currentHour < 18) {
        setCurrentTimeCategory('점심');
      } else if (currentHour >= 18) {
        setCurrentTimeCategory('저녁');
      } else {
        setCurrentTimeCategory('새벽');
      }
      
      setTimeRestrictions({
        breakfast: currentHour < 6 || currentHour >= 12, // 6시부터 11시59분까지만 아침식사 가능
        lunch: currentHour < 12 || currentHour >= 18, // 12시부터 17시59분까지만 점심식사 가능
        dinner: currentHour < 18 || currentHour >= 24, // 18시부터 23시59분까지만 저녁식사 가능
        snack: false, // 간식은 제한 없음
      });
    };

    checkTimeRestrictions();
    const intervalId = setInterval(checkTimeRestrictions, 60000); // 1분마다 시간 제한 확인

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="h-[100%] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <Text style={{ color: '#666', fontFamily: 'Pretendard-500' }}>데이터를 불러오는 중입니다...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[100%] flex justify-center items-center">
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <Text style={{ color: 'red', fontFamily: 'Pretendard-600', fontSize: '18px' }}>오류가 발생했습니다</Text>
          <Text style={{ color: '#666', fontFamily: 'Pretendard-500', display: 'block', marginTop: '8px' }}>{error.message}</Text>
        </div>
      </div>
    );
  }

  const handleMealClick = (mealType) => {
    navigate(`/meals/${mealType}`);
  };

  // 시간 제한 메시지 반환 함수
  const getTimeRestrictionMessage = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return '06시부터 11시59분까지만 기록 가능합니다';
      case 'lunch':
        return '12시부터 17시59분까지만 기록 가능합니다';
      case 'dinner':
        return '18시부터 23시59분까지만 기록 가능합니다';
      default:
        return '';
    }
  };

  // 오늘의 날짜 포맷팅
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\.$/, "");
  
  const weekday = today.toLocaleDateString("ko-KR", { weekday: "long" });

  // 현재 식사 완료 상태에 따른 진행률 계산
  const completedMeals = [
    mealFlags.breakfast, 
    mealFlags.lunch, 
    mealFlags.dinner
  ].filter(Boolean).length;
  
  const progressPercent = Math.floor((completedMeals / 3) * 100);

  return (
    <div className="h-[100%] bg-bg1 p-4 pb-16 overflow-auto">
      {/* 헤더 섹션 */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: '16px', 
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Row justify="space-between" align="middle">
          <div>
            <Text style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Pretendard-700'}}>
              {formattedDate} {weekday}
            </Text>
            <br />
            <Text style={{ fontSize: '16px', color: '#666', fontFamily: 'Pretendard-500'}}>
              현재 시간대: {currentTimeCategory}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* 테스트 버튼 추가 */}
            {/* <div 
              onClick={showTestModals}
              style={{ 
                position: 'relative', 
                cursor: 'pointer',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: '10px'
              }}
            >
              <ExperimentOutlined style={{ fontSize: '20px', color: '#1677ff' }} />
            </div> */}
            <div 
              onClick={showModal}
              style={{ 
                position: 'relative', 
                cursor: 'pointer',
                padding: '8px',
                background: isModalAvailable ? '#f0fff7' : '#f5f5f5',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <HistoryOutlined style={{ fontSize: '24px', color: isModalAvailable ? '#5FDD9D' : '#999' }} />
              {isModalAvailable && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ff4d4f',
                  borderRadius: '50%'
                }} />
              )}
            </div>
          </div>
        </Row>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Pretendard-600'}}>
              오늘의 식사 기록 진행률
            </Text>
            <Text style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'Pretendard-700', color: '#5FDD9D'}}>
              {progressPercent}%
            </Text>
          </div>
          <Progress 
            percent={progressPercent} 
            showInfo={false} 
            strokeColor="#5FDD9D" 
            trailColor="#f0f0f0"
            style={{ height: '8px' }}
          />
        </div>
      </Card>

      {/* 식사 기록 버튼 섹션 */}
      <Title level={4} style={{ margin: '24px 0 16px 0', fontFamily: 'Pretendard-700', color: '#5FDD9D' }}>
        일일 식사 기록
      </Title>
      
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <MealButton 
            title="아침 식사 기록"
            icon={<FireOutlined />}
            time="06:00 - 11:59"
            onClick={() => handleMealClick('breakfast')}
            disabled={mealFlags.breakfast || timeRestrictions.breakfast}
            isCompleted={mealFlags.breakfast}
            timeRestricted={!mealFlags.breakfast && timeRestrictions.breakfast}
            restrictionMessage={getTimeRestrictionMessage('breakfast')}
          />
        </Col>
        
        <Col span={24}>
          <MealButton 
            title="점심 식사 기록"
            icon={<FireOutlined />}
            time="12:00 - 17:59"
            onClick={() => handleMealClick('lunch')}
            disabled={mealFlags.lunch || timeRestrictions.lunch}
            isCompleted={mealFlags.lunch}
            timeRestricted={!mealFlags.lunch && timeRestrictions.lunch}
            restrictionMessage={getTimeRestrictionMessage('lunch')}
          />
        </Col>
        
        <Col span={24}>
          <MealButton 
            title="저녁 식사 기록"
            icon={<FireOutlined />}
            time="18:00 - 05:59"
            onClick={() => handleMealClick('dinner')}
            disabled={mealFlags.dinner || timeRestrictions.dinner}
            isCompleted={mealFlags.dinner}
            timeRestricted={!mealFlags.dinner && timeRestrictions.dinner}
            restrictionMessage={getTimeRestrictionMessage('dinner')}
          />
        </Col>
        
        <Col span={24}>
          <MealButton 
            title="간식 기록"
            icon={<CoffeeOutlined />}
            time="언제든지 기록 가능"
            onClick={() => handleMealClick('snack')}
            disabled={false}
            isCompleted={false}
            timeRestricted={false}
            accent={false}
          />
        </Col>
      </Row>
    </div>
  );
};

// 식사 버튼 컴포넌트
const MealButton = ({ 
  title, 
  icon, 
  time, 
  onClick, 
  disabled, 
  isCompleted, 
  timeRestricted, 
  restrictionMessage,
  accent = false
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl p-0 relative ${disabled ? 'opacity-60' : ''}`}
      style={{ 
        height: 'auto', 
        textAlign: 'left', 
        fontFamily: 'Pretendard-600', 
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        background: accent ? '#f0fff7' : 'white',
        borderColor: accent ? '#5FDD9D' : '#e8e8e8',
        padding: '16px',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '8px',
            color: isCompleted ? '#5FDD9D' : '#333'
          }}>
            {icon}
            <Text style={{ 
              marginLeft: '8px', 
              fontSize: '18px', 
              fontWeight: '600', 
              fontFamily: 'Pretendard-600',
              color: isCompleted ? '#5FDD9D' : '#333'
            }}>
              {title}
            </Text>
          </div>
          <Text style={{ 
            fontSize: '14px', 
            color: '#888', 
            fontFamily: 'Pretendard-500'
          }}>
            {time}
          </Text>
        </div>
        {isCompleted && (
          <CheckCircleTwoTone
            twoToneColor="#5FDD9D"
            style={{ fontSize: 24 }}
          />
        )}
      </div>
      
      {timeRestricted && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(255,255,255,0.9)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderRadius: '12px'
        }}>
          <ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f', marginBottom: '8px' }} />
          <Text style={{ fontSize: '14px', color: '#ff4d4f', fontFamily: 'Pretendard-500', textAlign: 'center' }}>
            {restrictionMessage}
          </Text>
        </div>
      )}
    </Button>
  );
};

export default Main; 