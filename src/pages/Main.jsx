import React from 'react';
import { Typography, Row, Col, Card, DatePicker } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

const { Text } = Typography;

const Main = () => {
  const today = dayjs();

  return (
    <div className="h-[100%] bg-bg1 p-4 rounded-md shadow-md">
      <Row justify="center" style={{ marginBottom: 20 }}>
        <Text style={{ color: "#5FDD9D", letterSpacing: '1px', fontSize: '28px', fontWeight: '800' }}>
          일일 칼로리 기록
        </Text>
      </Row>

      <Row justify="center" style={{ margin: '8px 0 8px 0' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '24px', fontWeight: '700' }}>
        {new Date()
          .toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\.$/, "")}
        </Text>
      </Row>
      <Row justify="center" style={{ marginBottom: '40px' }}>
        <Text style={{ letterSpacing: '0.5px', fontSize: '18px', fontWeight: '500' }}>
        {new Date().toLocaleDateString("ko-KR", { weekday: "long" })}
        </Text>
      </Row>

      <Row gutter={[16, 24]} justify="center">
        <Col span={20}>
          <Link to="/meals/breakfast">
            <Card
              hoverable
              className="bg-bg1 rounded-xl shadow-md p-0"
            >
              <Card.Meta title="아침식사 기록하기"/>
            </Card>
          </Link>
        </Col>
        <Col span={20}>
          <Link to="/meals/lunch">
            <Card
              hoverable
              className="bg-bg1 rounded-xl shadow-md p-0"
            >
              <Card.Meta title="점심식사 기록하기"/>
            </Card>
          </Link>
        </Col>
        <Col span={20}>
          <Link to="/meals/dinner">
            <Card
              hoverable
              className="bg-bg1 rounded-xl shadow-md p-0"
            >
              <Card.Meta title="저녁식사 기록하기"/>
            </Card>
          </Link>
        </Col>
        <Col span={20}>
          <Link to="/meals/snack">
            <Card
              hoverable
              className="bg-bg1 rounded-xl shadow-md p-0"
            >
              <Card.Meta title="간식 기록하기"/>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default Main; 