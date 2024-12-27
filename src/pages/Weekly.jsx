import React, { useEffect, useState } from 'react';
import { Card, Typography, Flex, Row, Col } from 'antd';
import { BankOutlined, FireOutlined } from '@ant-design/icons';
import CalorieOverChart from '@/components/common/CalorieOverChart.jsx';
import G2BarChart from '@/components/common/G2BarChart.jsx';
import NutrientPiechart from '@/components/common/NutrientPiechart.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '@/firebaseconfig';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { setWeeklyData } from '@/redux/actions/weeklyActions';

const { Text } = Typography;

const Weekly = () => {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const { weeklyData, lastFetched } = useSelector((state) => state.weekly);
  const [loading, setLoading] = useState(true);

  // 권장 칼로리 상수 추가
  const RECOMMENDED_DAILY_CALORIES = 2000;

  // 주의 시작일(일요일)과 종료일(토요일) 구하기
  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    
    const sunday = new Date(today.setDate(diff));
    const saturday = new Date(today.setDate(diff + 6));

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(sunday),
      end: formatDate(saturday),
    };
  };

  // 주간 데이터 가져오기
  useEffect(() => {
    const shouldFetchNewData = () => {
      if (!weeklyData || !lastFetched) return true;
      
      const now = new Date();
      const lastFetchDate = new Date(lastFetched);
      const hoursDiff = (now - lastFetchDate) / (1000 * 60 * 60);
      
      // 마지막 fetch로부터 1시간이 지났거나, 날짜가 바뀌었으면 새로 fetch
      return hoursDiff > 1 || now.getDate() !== lastFetchDate.getDate();
    };

    const fetchWeeklyData = async () => {
      if (!uid || !shouldFetchNewData()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { start, end } = getWeekDates();
        const foodsRef = collection(db, 'users', uid, 'foods');
        const q = query(
          foodsRef,
          where('date', '>=', start),
          where('date', '<=', end)
        );
        
        const querySnapshot = await getDocs(q);
        const data = [];
        
        querySnapshot.forEach((doc) => {
          const dayData = doc.data();
          if (dayData) {
            data.push(dayData);
          }
        });

        dispatch(setWeeklyData(data));
      } catch (error) {
        console.error('주간 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [uid, dispatch, weeklyData, lastFetched]);

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
        const overCalories = Math.max(0, dayTotalCalories - RECOMMENDED_DAILY_CALORIES);
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
        초과칼로리: Math.max(0, calories - RECOMMENDED_DAILY_CALORIES)
      }));
  };

  const getCalorieOverChartData = () => {
    if (!dailyCalories) return [];
    
    return Object.entries(dailyCalories)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, calories]) => ({
        date: formatDateLabel(date),
        '칼로리 초과': Math.max(0, calories - RECOMMENDED_DAILY_CALORIES)
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full items-center overflow-y-auto">
      <Flex justify="start" align="center" className="w-full ml-11 mb-5">
        <Text className="text-2xl font-bold text-jh-emphasize" style={{ letterSpacing: '1px' }}>
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