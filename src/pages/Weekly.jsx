import React from 'react';
import { Card, Space, Typography, Flex, Progress } from 'antd';
import { BankOutlined, FireOutlined } from '@ant-design/icons';
import CalorieOverChart from '@/components/common/CalorieOverChart.jsx';
import G2BarChart from '@/components/common/G2BarChart.jsx';
import NutrientPiechart from '@/components/common/NutrientPiechart.jsx';

const { Text } = Typography;

const Weekly = () => {
  const calories = 1000;
  const nutrient = '탄수화물';

  return (
    <div className="flex flex-col h-[200vh] w-full items-center">
      <Flex justify="start" align="center" className="w-full ml-11 mb-5">
        <Text
          className="text-2xl font-bold text-jh-emphasize"
          style={{ letterSpacing: '1px' }}
        >
          주간 칼로리현황
        </Text>
      </Flex>

      {/* 주간 칼로리 통계*/}
      <Space className="h-[7%] justify-center w-full mb-5">
        <Card bordered style={{ borderWidth: '1px', borderRadius: '14px' }}>
          <Flex justify="space-between" align="center">
            <Text className="font-bold">총 칼로리섭취량</Text>
            <FireOutlined style={{ color: '#5FDD9D' }} />
          </Flex>
          <Text className="text-lg font-semibold text-jh-emphasize">
            4,321 kcal
          </Text>
        </Card>
        <Card bordered style={{ borderWidth: '1px', borderRadius: '14px' }}>
          <Flex justify="space-between" align="center">
            <Text className="font-bold">총 칼로리초과량</Text>
            <BankOutlined style={{ color: '#DA6662' }} />
          </Flex>
          <Text className="text-lg font-semibold text-jh-red">
            1,234 kcal
          </Text>
        </Card>
      </Space>

      {/* 주간 칼로리 섭취 현황 */}
      
      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md"
        style={{ width: '90%' }}
        // bodyStyle={{ padding: '0', height: '200px' }}
      >
        <Flex
          className="h-full w-full flex-col justify-end"
          vertical
          align="stretch"
        >
          <Flex className="h-full w-full justify-between">
            <div className="h-[30%] w-[40%] ml-5 mt-8">
              <Text className="text-base font-normal">칼로리 섭취량은</Text>
              <Text className="text-base font-medium text-[#5FDD9D]">
                {calories}kcal
              </Text>
            </div>
          </Flex>
          <div className="w-full h-full">
            <G2BarChart />
          </div>
        </Flex>
      </Card>

      {/* 주간 칼로리 초과 현황 */}
      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md mt-5"
        style={{ width: '90%' }}
        // bodyStyle={{ padding: '0', height: '200px' }}
      >
        <Flex
          className="h-full w-full flex-col justify-end"
          vertical
          align="stretch"
        >
          <Flex className="h-full w-full justify-between">
            <div className="h-[30%] w-[40%] ml-5 mt-8">
              <Text className="text-base font-normal">칼로리 초과량은</Text>
              <Text className="text-base font-medium text-jh-red">
                {calories}kcal
              </Text>
            </div>
          </Flex>
          <div className="w-full h-full">
            <CalorieOverChart />
          </div>
        </Flex>
      </Card>

      {/* 주간 영양소 현황 */}
      <Card
        className="w-[90%] bg-bg1 rounded-xl shadow-md mt-5"
        style={{ width: '90%' }}
        // bodyStyle={{ padding: '0', height: '200px' }}
      >
        <Flex className="h-full w-full justify-between">
          <Flex className="h-full justify-center" vertical>
            <div className="h-full ml-5 mt-7">
              <Text className="text-base font-normal">
                섭취 영양성분 비율은<br />
              </Text>
              <Text className="text-base font-medium text-jh-emphasize">
                <span className="text-jh-emphasize">{nutrient}</span>
                <span className="text-black">이 제일 많아요</span>
              </Text>
            </div>
          </Flex>
          <div className="h-full flex justify-center items-center pt-5 pr-2">
            <NutrientPiechart />
          </div>
        </Flex>
      </Card>

      <div className="h-[100px] w-full" />
    </div>
  );
};

export default Weekly; 