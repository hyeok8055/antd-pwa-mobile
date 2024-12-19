import React from 'react';
import { Popup, Space, Button } from 'antd-mobile';

const SidePopUp = ({ visible, onClose, onLogout }) => {
    return (
        <>
            <Space direction='vertical'>
                <Popup visible={visible} onMaskClick={onClose} position='right' bodyStyle={{ width: '60vw' }}>
                    <Button onClick={onLogout}>로그아웃</Button>
                    {/* mockContent를 여기에 추가하세요 */}
                </Popup>
            </Space>
        </>
    );
};

export default SidePopUp;
