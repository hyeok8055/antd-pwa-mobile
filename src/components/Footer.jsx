import React from 'react';
import { TabBar } from 'antd-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  EditFill,
  CalendarOutline,
  HeartFill,
} from 'antd-mobile-icons';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const setRouteActive = (value) => {
    navigate(value);
  };

  const tabs = [
    { key: '/main', title: '식사 기록', icon: <EditFill /> },
    { key: '/fitness', title: '건강 일지', icon: <HeartFill /> },
    { key: '/weekly', title: '주간 현황', icon: <CalendarOutline /> },
  ];

  return (
    <TabBar activeKey={pathname} onChange={value => setRouteActive(value)} style={{ flex: 1 }}>
      {tabs.map(item => (
        <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
      ))}
    </TabBar>
  );
};

export default Footer; 