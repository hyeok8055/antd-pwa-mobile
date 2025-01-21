import React, { useEffect, useState } from 'react';
import { Card, Typography, Flex, Row, Col } from 'antd';
import { BankOutlined, FireOutlined } from '@ant-design/icons';
import CalorieOverChart from '@/components/common/CalorieOverChart.jsx';
import G2BarChart from '@/components/common/G2BarChart.jsx';
import NutrientPiechart from '@/components/common/NutrientPiechart.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '@/firebaseconfig';
import { doc, getDoc } from 'firebase/firestore';
import { useFitness } from '@/hook/useFitness';

const { Text } = Typography;

const Weekly = () => {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const { weeklyData } = useSelector((state) => state.weekly);
  const [user, setUser] = useState(null);
  const [recommendedDailyCalories, setRecommendedDailyCalories] = useState(null);
  const { fitnessData, loading: fitnessLoading } = useFitness(uid);

  const calculateBMR = (gender, height, weight, age) => {
    let bmr = 0;
    if (gender === 'male') {
      bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
    } else if (gender === 'female') {
      bmr = 655 + (9.6 * weight) + (1.85 * height) - (4.7 * age);
    }
    // console.log(bmr);
    return Math.round(bmr);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(userData);
          
          const today = new Date().toISOString().split('T')[0];
          const todayFitnessData = fitnessData.find(item => item.date === today);
          const weight = todayFitnessData?.weight || null;
          
          const calculatedBMR = calculateBMR(
            userData.gender,
            userData.height,
            weight,
            userData.age
          );
          setRecommendedDailyCalories(calculatedBMR);
        }
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setRecommendedDailyCalories(2000);
      }
    };

    fetchUserData();
  }, [uid, fitnessData]);

  const getWeekDates = () => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay() + 1); // 첫째날(일요일) 계산
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6); // 6일 후(토요일) 계산

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay),
    };
  };

  // 주간 통계 계산
  const calculateWeeklyStats = () => {
    if (!weeklyData) {
      return {
        totalCalories: 0,
        totalOverCalories: 0,
        dailyCalories: {},
        nutrientTotals: { carbs: 0, protein: 0, fat: 0 }
      };
    }

    const { start } = getWeekDates();
    const startDate = new Date(start);
    const dailyCalories = {};
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const formattedDate = currentDate.toISOString().split('T')[0];
      dailyCalories[formattedDate] = 0;
    }

    let totalCalories = 0;
    let totalOverCalories = 0;
    const nutrientTotals = { carbs: 0, protein: 0, fat: 0 };

    weeklyData.forEach(dayData => {
      if (!dayData.date) return;
      
      const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
      let dayTotalCalories = 0;

      meals.forEach(meal => {
        if (dayData[meal] && dayData[meal].actualCalories) {
          dayTotalCalories += dayData[meal].actualCalories;
          
          if (dayData[meal].foods) {
            dayData[meal].foods.forEach(food => {
              if (food.nutrients) {
                nutrientTotals.carbs += food.nutrients.carbs || 0;
                nutrientTotals.protein += food.nutrients.protein || 0;
                nutrientTotals.fat += food.nutrients.fat || 0;
              }
            });
          }
        }
      });

      if (dayTotalCalories > 0) {
        totalCalories += dayTotalCalories;
        const overCalories = Math.max(0, dayTotalCalories - recommendedDailyCalories);
        totalOverCalories += overCalories;
        dailyCalories[dayData.date] = dayTotalCalories;
      }
    });

    return { totalCalories, totalOverCalories, dailyCalories, nutrientTotals };
  };

  const { totalCalories, totalOverCalories, dailyCalories, nutrientTotals } = calculateWeeklyStats();

  // 차트 데이터는 존재하는 데이터만 포함
  const getBarChartData = () => {
    if (!dailyCalories) return [];
    
    return Object.entries(dailyCalories)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, calories]) => ({
        date: formatDateLabel(date),
        섭취칼로리: calories,
        초과칼로리: Math.max(0, calories - recommendedDailyCalories)
      }));
  };

  const getCalorieOverChartData = () => {
    if (!dailyCalories) return [];
    
    return Object.entries(dailyCalories)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, calories]) => ({
        date: formatDateLabel(date),
        '칼로리 초과': Math.max(0, calories - recommendedDailyCalories)
      }));
  };

  // 날짜 포맷 함수 추가
  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  const getNutrientPieChartData = () => {
    const { carbs, protein, fat } = nutrientTotals;
    const total = carbs + protein + fat;
    if (total === 0) return [];
    
    return [
      { item: '탄수화물', count: carbs },
      { item: '단백질', count: protein },
      { item: '지방', count: fat }
    ];
  };

  const getTopNutrient = () => {
    const { carbs, protein, fat } = nutrientTotals;
    if (carbs >= protein && carbs >= fat) return '탄수화물';
    if (protein >= carbs && protein >= fat) return '단백질';
    return '지방';
  };

  return (
    <div className="flex flex-col w-full items-center overflow-y-auto">
      <Flex justify="start" align="center" className="w-full pl-7 mb-5">
        <Text style={{ letterSpacing: '1px', fontFamily: 'Pretendard-700', fontSize: '28px', color: '#5FDD9D'}}>
          주간 칼로리현황
        </Text>
      </Flex>

      <Row gutter={[16, 16]} className="h-[7%] justify-center w-full mb-1">
        <Col span={11}>
          <Card
            bordered
            className="bg-bg1 rounded-xl shadow-md p-0"
            style={{ borderWidth: '1px', borderRadius: '14px' }}
            bodyStyle={{ padding: '18px' }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Text className="font-bold">총 칼로리섭취량</Text>
              </Col>
              <Col>
                <FireOutlined style={{ color: '#5FDD9D' }} />
              </Col>
            </Row>
            <Text className="text-lg font-semibold text-jh-emphasize">
              {Math.round(totalCalories)} kcal
            </Text>
          </Card>
        </Col>
        <Col span={11}>
          <Card
            bordered
            className="bg-bg1 rounded-xl shadow-md p-0"
            style={{ borderWidth: '1px', borderRadius: '14px' }}
            bodyStyle={{ padding: '18px' }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Text className="font-bold">총 칼로리초과량</Text>
              </Col>
              <Col>
                <BankOutlined style={{ color: '#DA6662' }} />
              </Col>
            </Row>
            <Text className="text-lg font-semibold text-jh-red">
              {Math.round(totalOverCalories)} kcal
            </Text>
          </Card>
        </Col>
      </Row>

      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md p-0"
        style={{ width: '90%', height: '200px', marginTop: '15px' }}
      >
        <Row>
          <Col span={24}>
            <Text className="text-base font-normal">칼로리 섭취량은</Text>
          </Col>
          <Col span={24}>
            <Text className="text-base font-medium text-[#5FDD9D]">
              {Math.round(totalCalories)}kcal
            </Text>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <G2BarChart data={getBarChartData()} />
          </Col>
        </Row>
      </Card>

      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md mt-5"
        style={{ width: '90%', height: '200px' }}
      >
        <Row>
          <Col span={24}>
            <Text className="text-base font-normal">칼로리 초과량은</Text>
          </Col>
          <Col span={24}>
            <Text className="text-base font-medium text-jh-red">
              {Math.round(totalOverCalories)}kcal
            </Text>
          </Col>
          <Col span={24}>
            <CalorieOverChart data={getCalorieOverChartData()} />
          </Col>
        </Row>
      </Card>

      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md mt-5"
        style={{ width: '90%', height: '200px', marginBottom: '100px' }}
      >
        <Row>
          <Col span={11}>
            <Text className="text-base font-normal" style={{ whiteSpace: 'nowrap' }}>
              섭취 영양성분 비율은
            </Text>
            <Text className="text-base font-medium text-jh-emphasize inline-block" style={{ whiteSpace: 'nowrap' }}>
              <span className="text-jh-emphasize">{getTopNutrient()}</span>
              <span className="text-black">이 제일 많아요</span>
            </Text>
          </Col>
          <Col span={13} style={{ marginTop: '15%' }}>
            <NutrientPiechart data={getNutrientPieChartData()} />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Weekly; 