import React, { useEffect, useState } from 'react';
import { Card, Typography, Flex, Row, Col } from 'antd';
import { BankOutlined, FireOutlined } from '@ant-design/icons';
import CalorieOverChart from '@/components/common/CalorieOverChart.jsx';
import G2BarChart from '@/components/common/G2BarChart.jsx';
import NutrientPiechart from '@/components/common/NutrientPiechart.jsx';
import { useSelector } from 'react-redux';
import { db } from '@/firebaseconfig';
import { doc, getDoc, collection, query, orderBy, limit, setDoc, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';

const { Text } = Typography;

const Weekly = () => {
  const uid = useSelector((state) => state.auth.user?.uid);
  const [recommendedDailyCalories, setRecommendedDailyCalories] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({
    totalCalories: 0,
    totalDeficit: 0,
    dailyData: []
  });

  const calculateBMR = (gender, height, weight, age) => {
    let bmr = 0;
    if (gender === 'male') {
      bmr = 66 + (13.7 * (weight || 70)) + (5 * height) - (6.8 * age);
    } else if (gender === 'female') {
      bmr = 655 + (9.6 * (weight || 60)) + (1.85 * height) - (4.7 * age);
    }
    return Math.round(bmr);
  };

  const updateTodayWeeklyData = async (currentBMR, todayFoodsData) => {
    if (!todayFoodsData) return;
    
    const today = dayjs().format('YYYY-MM-DD');
    const todayWeeklyRef = doc(db, 'users', uid, 'weekly', today);
    
    // 총 칼로리 계산
    const totalCalories = [
      todayFoodsData.breakfast?.actualCalories || 0,
      todayFoodsData.lunch?.actualCalories || 0,
      todayFoodsData.dinner?.actualCalories || 0,
      todayFoodsData.snacks?.actualCalories || 0
    ].reduce((sum, cal) => sum + cal, 0);

    // 총 영양소 계산
    const totalNutrients = ['breakfast', 'lunch', 'dinner', 'snacks'].reduce((acc, mealType) => {
      const foods = todayFoodsData[mealType]?.foods || [];
      foods.forEach(food => {
        if (food.nutrients) {
          acc.totalCarbs += food.nutrients.carbs || 0;
          acc.totalProtein += food.nutrients.protein || 0;
          acc.totalFat += food.nutrients.fat || 0;
        }
      });
      return acc;
    }, { totalCarbs: 0, totalProtein: 0, totalFat: 0 });

    // 새로운 BMR 기준으로 칼로리 초과량 재계산
    const calorieDeficit = Math.max(0, totalCalories - currentBMR);

    // 새로운 weekly 데이터
    const newWeeklyData = {
      bmr: currentBMR,
      calorieDeficit,
      totalCalories,
      ...totalNutrients
    };

    await setDoc(todayWeeklyRef, newWeeklyData);
    console.log('Updated today\'s weekly data with new BMR:', currentBMR);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;
      setLoading(true);

      try {
        // 사용자 기본 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          console.log('No user data found');
          return;
        }
        const userData = userDoc.data();
        const { gender, height, age } = userData;

        // 최신 체중 데이터 가져오기
        const fitnessQuery = query(
          collection(db, 'users', uid, 'fitness'),
          orderBy('date', 'desc'),
          limit(1)
        );
        const fitnessSnapshot = await getDocs(fitnessQuery);
        let weight = null;
        if (!fitnessSnapshot.empty) {
          weight = fitnessSnapshot.docs[0].data().weight;
        }

        // 현재 BMR 계산
        const currentBMR = calculateBMR(gender, height, weight, age);
        setRecommendedDailyCalories(currentBMR);

        // 오늘 날짜의 weekly 문서 확인
        const today = dayjs().format('YYYY-MM-DD');
        const todayWeeklyRef = doc(db, 'users', uid, 'weekly', today);
        const todayWeeklyDoc = await getDoc(todayWeeklyRef);

        // 오늘의 foods 데이터 가져오기
        const todayFoodsRef = doc(db, 'users', uid, 'foods', today);
        const todayFoodsDoc = await getDoc(todayFoodsRef);
        const todayFoodsData = todayFoodsDoc.exists() ? todayFoodsDoc.data() : null;

        // BMR 값이 다르거나 weekly 문서가 없는 경우 업데이트
        if (!todayWeeklyDoc.exists() || todayWeeklyDoc.data().bmr !== currentBMR) {
          console.log('BMR changed or no weekly data exists. Updating...');
          await updateTodayWeeklyData(currentBMR, todayFoodsData);
        }

        // 이번 주의 데이터 가져오기
        const startOfWeek = dayjs().startOf('week');
        const weeklyData = [];
        
        for (let i = 0; i < 7; i++) {
          const currentDate = startOfWeek.add(i, 'day').format('YYYY-MM-DD');
          const weeklyDocRef = doc(db, 'users', uid, 'weekly', currentDate);
          const weeklyDoc = await getDoc(weeklyDocRef);
          
          if (weeklyDoc.exists()) {
            weeklyData.push({
              date: currentDate,
              ...weeklyDoc.data()
            });
          } else {
            weeklyData.push({
              date: currentDate,
              totalCalories: 0,
              calorieDeficit: 0,
              totalCarbs: 0,
              totalProtein: 0,
              totalFat: 0,
              bmr: currentBMR
            });
          }
        }

        // 주간 통계 계산
        const stats = {
          totalCalories: weeklyData.reduce((sum, day) => sum + (day.totalCalories || 0), 0),
          totalDeficit: weeklyData.reduce((sum, day) => sum + (day.calorieDeficit || 0), 0),
          dailyData: weeklyData
        };
        
        setWeeklyStats(stats);
      } catch (error) {
        console.error('Error fetching/creating user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [uid]);

  const getBarChartData = () => {
    return weeklyStats.dailyData.map(day => ({
      date: dayjs(day.date).format('MM/DD'),
      섭취칼로리: day.totalCalories
    }));
  };

  const getCalorieOverChartData = () => {
    return weeklyStats.dailyData.map(day => ({
      date: dayjs(day.date).format('MM/DD'),
      칼로리초과: Math.max(0, day.calorieDeficit)
    }));
  };

  const getNutrientPieChartData = () => {
    const totals = weeklyStats.dailyData.reduce((acc, day) => ({
      carbs: acc.carbs + day.totalCarbs,
      protein: acc.protein + day.totalProtein,
      fat: acc.fat + day.totalFat
    }), { carbs: 0, protein: 0, fat: 0 });

    if (totals.carbs === 0 && totals.protein === 0 && totals.fat === 0) return [];

    return [
      { type: '탄수화물', value: parseFloat(totals.carbs.toFixed(2)) },
      { type: '단백질', value: parseFloat(totals.protein.toFixed(2)) },
      { type: '지방', value: parseFloat(totals.fat.toFixed(2)) }
    ];
  };

  const getTopNutrient = () => {
    const totals = weeklyStats.dailyData.reduce((acc, day) => ({
      carbs: acc.carbs + day.totalCarbs,
      protein: acc.protein + day.totalProtein,
      fat: acc.fat + day.totalFat
    }), { carbs: 0, protein: 0, fat: 0 });

    const { carbs, protein, fat } = totals;
    if (carbs > protein && carbs > fat) {
      return '탄수화물';
    } else if (protein > carbs && protein > fat) {
      return '단백질';
    } else if (fat > carbs && fat > protein) {
      return '지방';
    } else {
      return '균형';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Flex justify="start" align="center" className="w-full pl-7 mb-5">
        <Text style={{ letterSpacing: '1px', fontFamily: 'Pretendard-700', fontSize: '28px', color: '#5FDD9D'}}>
          주간 칼로리현황
        </Text>
      </Flex>
      <Row justify="space-between" style={{ width: '90%', marginBottom: '10px' }}>
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
            <Text className="text-lg font-semibold text-[#5FDD9D]">
              {Math.round(weeklyStats.totalCalories)} kcal
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
              {Math.round(weeklyStats.totalDeficit)} kcal
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
              {Math.round(weeklyStats.totalCalories)} kcal
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
              {Math.round(weeklyStats.totalDeficit)} kcal
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