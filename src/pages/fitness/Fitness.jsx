import { CalendarPickerView, Form, Input, Picker, Button } from 'antd-mobile'
import { Card, Typography } from 'antd'
import React, { useState } from 'react'
import { basicColumns } from './columns-data'

const { Text } = Typography;


export default () => {
  const BasicDemo = () => {
      const [visible, setVisible] = useState(false);
      const [value, setValue] = useState(['M']);
      return (
          <>
              <Button onClick={() => setVisible(true)}>
                  选择
              </Button>
              <Picker
                  columns={basicColumns}
                  visible={visible}
                  onClose={() => setVisible(false)}
                  value={value}
                  onConfirm={(v) => setValue(v)}
              />
          </>
      );
  };

  return (
    <div className="flex flex-col w-full items-center overflow-y-auto">
      <div className="mt-[-10vh] h-[52vh] w-[100%] bg-bg1 rounded-md shadow-lg overflow-y-hidden flex flex-col">
        <CalendarPickerView
          title={<div></div>}
          selectionMode="single"
          onChange={(val) => {
            console.log(val)
          }}
          defaultValue={new Date()}
          renderTop={(date) => {
            if (date.toDateString() === new Date().toDateString()) {
              return <div>오늘</div>; 
            } else {
              return <div></div>;
            }
          }}
        />

      </div>
      <div className="w-full flex flex-col items-center">
        <Card
          className="bg-bg1 rounded-xl shadow-lg mt-5"
          style={{ width: '95%', height: '150px' }}
        >
          <Text style={{ fontSize: '15px', fontWeight: 'bold' }}>
            오늘의 건강상태 기록하기
          </Text>
          <Form layout="horizontal">
            <Form.Item label="키" name="height">
              <Input placeholder="키를 입력해주세요" />
            </Form.Item>
            <Form.Item label="체중" name="weight">
              <Input placeholder="체중을 입력해주세요" />
            </Form.Item>
          </Form>
        </Card>
      </div>
      <div className="mt-[50vh] w-full flex flex-col items-center"></div>
    </div>
  )
}