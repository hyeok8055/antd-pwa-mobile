import React from 'react';
import { Card, Typography, Flex, Row, Col } from 'antd';
import { BankOutlined, FireOutlined } from '@ant-design/icons';
import CalorieOverChart from '@/components/common/CalorieOverChart.jsx';
import G2BarChart from '@/components/common/G2BarChart.jsx';
import NutrientPiechart from '@/components/common/NutrientPiechart.jsx';


const { Text } = Typography;

const Weekly = () => {
  const calories = 1000;
  const nutrient = '탄수화물';

  return (
    <div className="flex flex-col w-full items-center overflow-y-auto">
      <Flex justify="start" align="center" className="w-full ml-11 mb-5">
        <Text
          className="text-2xl font-bold text-jh-emphasize"
          style={{ letterSpacing: '1px' }}
        >
          주간 칼로리현황
        </Text>
      </Flex>

      {/* 주간 칼로리 통계*/}
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
              4,321 kcal
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
              1,234 kcal
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 주간 칼로리 섭취 현황 */}
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
                {calories}kcal
            </Text>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <G2BarChart />
          </Col>
        </Row>
      </Card>

      {/* 주간 칼로리 초과 현황 */}
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
              {calories}kcal
            </Text>
          </Col>
          <Col span={24}>
            <CalorieOverChart />
          </Col>
        </Row>
      </Card>

      {/* 주간 영양소 현황 */}
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
              <span className="text-jh-emphasize">{nutrient}</span>
              <span className="text-black">이 제일 많아요</span>
            </Text>
          </Col>
          <Col span={13} style={{ marginTop: '15%' }}>
            <NutrientPiechart />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Weekly; 