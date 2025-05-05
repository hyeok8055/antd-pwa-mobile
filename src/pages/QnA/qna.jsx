import React, { useState } from 'react';
import { Collapse, SearchBar, Tabs } from 'antd-mobile';
import './qna.css';
import { Typography } from 'antd';
const { Text } = Typography;

const QnA = () => {
  const [searchText, setSearchText] = useState('');
  
  // QnA 데이터를 카테고리별로 구성
  const qnaCategories = {
    app: {
      title: '앱 사용법',
      items: [
        {
          key: 'a0',
          title: '왜 예측 칼로리를 기재하나요?',
          content: '연구에 따르면, 단순히 섭취한 칼로리를 제공받는 것보다 스스로 음식의 칼로리를 추정해보는 것이 다이어트에 더 효과적이라고 합니다. 이에 저희 앱은 이러한 방식으로 사용자 경험을 개선하고 있습니다.'
        },
        {
          key: 'a00',
          title: '그럼 실제 칼로리는 언제 알 수 있나요?',
          content: '실제 칼로리는 다음 식사 직전에 제공됩니다.'
        },
        {
          key: 'a1',
          title: '이 앱은 어떤 기능을 제공하나요?',
          content: '칼로리 싱크는 식단 관리, 운동 기록, 체중 추적, BMI 계산 등을 제공하는 종합 건강 관리 앱입니다. 매일의 식사를 기록하고 칼로리를 추적하며, 운동 활동을 기록하고 건강 목표를 향해 나아갈 수 있도록 도와줍니다.'
        },
        {
          key: 'a2',
          title: '식단 기록은 어떻게 하나요?',
          content: '메인 화면에서 아침, 점심, 저녁, 간식 중 기록하고 싶은 식사를 선택하세요. 음식을 검색하거나 직접 입력할 수 있으며, 예상 칼로리와 실제 섭취 칼로리를 기록할 수 있습니다. 기록된 데이터는 당신의 건강 관리에 도움이 됩니다.'
        },
        {
          key: 'a3',
          title: '운동 기록은 어떻게 관리되나요?',
          content: '피트니스 페이지에서 오늘의 체중을 입력하고 운동 종목과 시간을 추가할 수 있습니다. 다양한 운동 종목 중에서 선택하거나 검색할 수 있으며, 각 운동별로 소요 시간을 기록할 수 있습니다. 기록된 운동 데이터는 저장되어 건강 관리에 활용됩니다.'
        },
        {
          key: 'a4',
          title: '내 BMI는 어떻게 확인하나요?',
          content: '피트니스 페이지에서 체중을 입력하면 자동으로 BMI가 계산됩니다. 키 정보는 프로필 설정에서 입력할 수 있으며, 변경이 필요한 경우 BMI 차트 옆의 설정 아이콘을 통해 수정할 수 있습니다. BMI 차트는 저체중, 정상, 과체중, 비만, 고도비만 등의 범주를 시각적으로 보여줍니다.'
        },
        {
          key: 'a5',
          title: '음식 추가는 어떻게 하나요?',
          content: '식사 목록 화면에서 우측 상단의 \'음식추가하기\' 버튼을 클릭하면 새로운 음식을 추가할 수 있습니다. 음식 이름, 중량, 칼로리, 영양소(탄수화물, 단백질, 지방) 정보를 입력하면 됩니다. 추가한 음식은 다음 검색 시 바로 선택할 수 있습니다.'
        },
        {
          key: 'a6',
          title: '개인 정보는 어떻게 수정하나요?',
          content: '화면 상단의 설정 아이콘을 클릭하면 사이드 팝업이 열립니다. 여기서 키, 성별, 나이, 활동 수준, 목표 등의 개인 정보를 확인하고 수정할 수 있습니다. 수정 버튼을 클릭하여 편집 모드로 전환한 후 정보를 업데이트하고 저장할 수 있습니다.'
        },
        {
          key: 'a7',
          title: '알림 기능은 어떻게 작동하나요?',
          content: '앱은 식사 시간대에 따라 칼로리 섭취 결과를 알려주는 알림 기능을 제공합니다. 아침, 점심, 저녁 식사 후 다음 식사 시간대에 이전 식사의 예상 칼로리와 실제 칼로리 차이를 알려주어 식습관 개선에 도움을 줍니다. 알림을 받으려면 브라우저의 알림 권한을 허용해야 합니다.'
        }
      ]
    },
    diet: {
      title: '다이어트',
      items: [
        {
          key: 'd1',
          title: '다이어트를 시작하려면 어떻게 해야 하나요?',
          content: '다이어트를 시작하기 위해서는 먼저 현재 체중과 목표 체중을 설정하고, 식단 조절과 적절한 운동을 병행하는 것이 좋습니다. 급격한 체중 감량보다는 천천히 꾸준히 하는 것이 건강에 좋습니다.'
        },
        {
          key: 'd2',
          title: '하루에 몇 칼로리를 섭취해야 하나요?',
          content: '일반적으로 성인 여성은 하루 약 1,800~2,000칼로리, 성인 남성은 2,200~2,500칼로리가 권장됩니다. 다이어트 중이라면 기초대사량에서 300~500칼로리 정도 적게 섭취하는 것이 적절합니다.'
        },
        {
          key: 'd3',
          title: '체중이 정체기에 들어갔을 때는 어떻게 해야 하나요?',
          content: '체중 정체기는 다이어트 과정에서 자연스러운 현상입니다. 운동 루틴을 변경하거나, 식단을 약간 조정해보세요. 또한 충분한 수면과 스트레스 관리도 중요합니다. 인내심을 가지고 꾸준히 노력하면 다시 체중 감량이 시작될 것입니다.'
        },
        {
          key: 'd4',
          title: '다이어트 중 간식은 어떻게 관리해야 하나요?',
          content: '다이어트 중에도 간식을 완전히 배제할 필요는 없습니다. 단, 과일, 견과류, 그릭 요거트 등 영양가 있는 간식을 선택하고, 정해진 양만 섭취하는 것이 중요합니다. 간식 섭취 시간도 식사와 식사 사이에 규칙적으로 배치하는 것이 좋습니다.'
        },
        {
          key: 'd5',
          title: '다이어트 중 외식은 어떻게 해야 하나요?',
          content: '외식 시에는 가능한 메뉴의 영양 정보를 확인하고, 샐러드나 구운 요리를 선택하는 것이 좋습니다. 소스는 따로 요청하여 양을 조절하고, 탄산음료보다는 물이나 차를 선택하세요. 또한 식사 전 간단한 간식을 먹어 과식을 방지하는 것도 도움이 됩니다.'
        }
      ]
    },
    exercise: {
      title: '운동',
      items: [
        {
          key: 'e1',
          title: '운동은 얼마나 자주 해야 효과적인가요?',
          content: '일주일에 최소 3~5회, 한 번에 30분 이상의 유산소 운동과 주 2~3회의 근력 운동을 병행하는 것이 효과적입니다. 처음에는 가볍게 시작해서 점차 강도를 높여가는 것이 좋습니다.'
        },
        {
          key: 'e2',
          title: '체중 감량에 가장 효과적인 운동은 무엇인가요?',
          content: '체중 감량을 위해서는 유산소 운동(조깅, 수영, 사이클링 등)과 근력 운동을 병행하는 것이 가장 효과적입니다. 유산소 운동은 칼로리 소모에 도움이 되고, 근력 운동은 기초대사량을 높여 장기적인 체중 관리에 도움이 됩니다.'
        },
        {
          key: 'e3',
          title: '운동 시간은 언제가 가장 좋은가요?',
          content: '운동 시간은 개인의 생활 패턴과 선호도에 따라 다릅니다. 아침 운동은 신진대사를 활성화시키고 하루를 활기차게 시작하는 데 도움이 되며, 저녁 운동은 일과 후 스트레스 해소에 좋습니다. 중요한 것은 규칙적으로 운동하는 습관을 들이는 것입니다.'
        },
        {
          key: 'e4',
          title: '운동 전후에 어떤 음식을 먹어야 하나요?',
          content: '운동 전에는 탄수화물과 단백질이 적절히 포함된 가벼운 식사를 1-2시간 전에 하는 것이 좋습니다. 운동 후에는 30분 이내에 단백질과 탄수화물을 함께 섭취하여 근육 회복을 돕는 것이 좋습니다. 수분 보충도 매우 중요합니다.'
        },
        {
          key: 'e5',
          title: '운동 중 부상을 방지하는 방법은 무엇인가요?',
          content: '운동 전 충분한 준비운동과 운동 후 정리운동을 하는 것이 중요합니다. 적절한 운동 강도를 유지하고, 올바른 자세로 운동하며, 충분한 휴식을 취하는 것도 부상 방지에 도움이 됩니다. 또한 적절한 운동복과 신발을 착용하는 것도 중요합니다.'
        }
      ]
    },
    nutrition: {
      title: '영양',
      items: [
        {
          key: 'n1',
          title: '식단 관리는 어떻게 해야 하나요?',
          content: '균형 잡힌 식단을 위해 단백질, 탄수화물, 지방, 비타민, 미네랄을 골고루 섭취하세요. 과일, 채소, 통곡물, 저지방 단백질 위주로 식단을 구성하고, 가공식품과 당분이 많은 음식은 줄이는 것이 좋습니다.'
        },
        {
          key: 'n2',
          title: '단백질은 얼마나 섭취해야 하나요?',
          content: '일반적으로 체중 1kg당 0.8~1.2g의 단백질 섭취가 권장됩니다. 운동량이 많거나 근육 증가를 목표로 한다면 체중 1kg당 1.6~2.2g까지 섭취할 수 있습니다. 육류, 생선, 계란, 콩류, 유제품 등 다양한 단백질 공급원을 활용하세요.'
        },
        {
          key: 'n3',
          title: '탄수화물을 줄이는 것이 체중 감량에 도움이 되나요?',
          content: '탄수화물 섭취를 조절하는 것은 체중 감량에 도움이 될 수 있지만, 완전히 배제하는 것은 권장하지 않습니다. 정제된 탄수화물보다는 통곡물, 과일, 채소와 같은 복합 탄수화물을 선택하고, 적절한 양을 섭취하는 것이 중요합니다.'
        },
        {
          key: 'n4',
          title: '건강한 지방과 불건강한 지방의 차이는 무엇인가요?',
          content: '건강한 지방은 불포화지방으로 아보카도, 견과류, 올리브유, 생선 등에 포함되어 있습니다. 불건강한 지방은 트랜스지방과 과도한 포화지방으로, 가공식품, 튀긴 음식, 고지방 육류 등에 많이 포함되어 있습니다. 건강한 지방은 적절히 섭취하고 불건강한 지방은 제한하는 것이 좋습니다.'
        },
        {
          key: 'n5',
          title: '식이 보충제는 필요한가요?',
          content: '균형 잡힌 식단을 통해 대부분의 영양소를 섭취할 수 있지만, 특정 상황(예: 비건 식단, 특정 영양소 결핍 등)에서는 보충제가 도움이 될 수 있습니다. 보충제 섭취 전에 전문가와 상담하는 것이 좋습니다.'
        }
      ]
    }
  };

  // 모든 QnA 항목을 하나의 배열로 합치기
  const allQnA = Object.values(qnaCategories).flatMap(category => category.items);
  
  // 검색 기능
  const filteredQnA = searchText
    ? allQnA.filter(item => 
        item.title.toLowerCase().includes(searchText.toLowerCase()) || 
        item.content.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  return (
    <div className="qna-container">
      <Text style={{ fontSize: '28px', fontFamily: 'Pretendard-800', letterSpacing: '1px', marginBottom: 15, textAlign: 'center' }}>
        자주 묻는 질문
      </Text>
      
      <div className="qna-search-section">
        <SearchBar
          placeholder="질문 검색하기"
          value={searchText}
          onChange={setSearchText}
          onClear={() => setSearchText('')}
          showCancelButton
        />
      </div>
      
      {searchText ? (
        <div className="qna-search-results">
          <h2 className="qna-subtitle">검색 결과: {filteredQnA.length}개</h2>
          {filteredQnA.length > 0 ? (
            <Collapse>
              {filteredQnA.map(item => (
                <Collapse.Panel key={item.key} title={item.title}>
                  {item.content}
                </Collapse.Panel>
              ))}
            </Collapse>
          ) : (
            <p className="qna-no-results">검색 결과가 없습니다. 다른 키워드로 검색해보세요.</p>
          )}
        </div>
      ) : (
        <div className="qna-tabs-section">
          <Tabs>
            {Object.entries(qnaCategories).map(([key, category]) => (
              <Tabs.Tab title={category.title} key={key}>
                <div className="qna-category-content">
                  <Collapse defaultActiveKey={key === 'app' ? ['a0'] : []}>
                    {category.items.map(item => (
                      <Collapse.Panel key={item.key} title={item.title}>
                        {item.content}
                      </Collapse.Panel>
                    ))}
                  </Collapse>
                </div>
              </Tabs.Tab>
            ))}
          </Tabs>
        </div>
      )}

      <div className="qna-contact-section">
        <p className="qna-contact">
          더 궁금한 점이 있으시면 언제든지 문의해주세요.
          <br />
          이메일: juheyok0123@gmail.com
        </p>
      </div>
      <div className='h-[7%]'></div>
    </div>
  );
};

export default QnA;
