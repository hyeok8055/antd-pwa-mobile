import React from 'react';
import { TabBar } from 'antd-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  EditFill,
  CalendarOutline,
  HeartFill,
  QuestionCircleOutline,
} from 'antd-mobile-icons';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const setRouteActive = (value) => {
    navigate(value);
  };

  const tabs = [
    {
      key: '/main',
      title: '식사 기록',
      icon: <EditFill />,
    },
    {
      key: '/fitness',
      title: '건강 일지',
      icon: <HeartFill />,
    },
    {
      key: '/qna',
      title: 'FAQ',
      icon: <QuestionCircleOutline />,
    },
  ];

  return (
    <TabBar
      activeKey={pathname}
      onChange={value => setRouteActive(value)}
      style={{ 
        height: '100%',
        '--adm-color-primary': '#5FDD9D'
      }}
    >
      {tabs.map(item => (
        <TabBar.Item
          key={item.key}
          title={item.title}
          icon={item.icon}
        />
      ))}
    </TabBar>
  );
};

export default Footer; 