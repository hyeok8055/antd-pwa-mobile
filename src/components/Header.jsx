import React from 'react';
import { NavBar, Space } from 'antd-mobile';
import { SetOutline } from 'antd-mobile-icons'

const right = (
	<div style={{ fontSize: 27 }}>
		<Space style={{ '--gap': '16px', marginTop: '15px' }}>
			<SetOutline />
		</Space>
	</div>
)

const Header = () => {
  return (
		<NavBar right={right} backIcon={false}></NavBar>
  );
};

export default Header; 