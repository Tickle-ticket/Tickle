import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Tab from './Tab';

const meta: Meta<typeof Tab> = {
  title: 'Shared/Tab',
  component: Tab,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['small', 'large'], description: '탭 사이즈' },
    fluid: { control: 'boolean', description: '가로 스크롤 허용 여부' },
    itemGap: { control: 'number', description: '탭 사이의 간격 (px)' },
    isLoading: { control: 'boolean', description: '로딩 상태(스켈레톤) 여부' },
    skeletonCount: { 
      control: { type: 'number', min: 1, max: 10 }, 
      description: '스켈레톤(막대기)의 개수 설정 (기본값: 3)' 
    },
    children: {
      description: '내부에 들어갈 Tab.Item 컴포넌트들입니다. (함수/컴포넌트라 직접 입력이 막혀있습니다)',
      control: false,
    },
    onChange: {
      description: '탭 변경 시 실행되는 함수입니다.',
      control: false,
      action: 'changed',
    },
    tabNames: {
      name: '(스토리북 전용) 탭 이름 변경 테스트',
      control: 'object',
      description: '이 배열을 수정해서 탭의 글자와 개수를 테스트해보세요!',
    }
  },
};

export default meta;
type Story = StoryObj<typeof Tab & { tabNames?: string[] }>;

/** 클릭할 때마다 상태가 변하는 기본적인 탭의 형태입니다. */
export const Default: Story = {
  args: {
    tabNames: ['전체', '결제 내역', '충전 내역'],
  },
  render: ({ tabNames, ...args }) => {
    const [active, setActive] = useState(0);
    const validTabs = Array.isArray(tabNames) ? tabNames : ['전체', '결제 내역', '충전 내역'];
    
    return (
      <Tab {...args} size={args.size || 'large'} onChange={(idx) => { setActive(idx); args.onChange?.(idx); }}>
        {validTabs.map((name, index) => (
          <Tab.Item key={index} selected={active === index}>{name}</Tab.Item>
        ))}
      </Tab>
    );
  },
};

/** redBean 속성을 사용해 새로운 업데이트가 있음을 알리는 빨간 점(Red Bean)을 붙일 수 있습니다. */
export const WithRedBean: Story = {
  name: '알림 표시(Red Bean) 탭',
  render: () => {
    const [active, setActive] = useState(1);
    return (
      <Tab size="large" onChange={setActive}>
        <Tab.Item selected={active === 0}>소식</Tab.Item>
        <Tab.Item selected={active === 1} redBean>알람 (2)</Tab.Item>
        <Tab.Item selected={active === 2}>설정</Tab.Item>
      </Tab>
    );
  },
};

/** isLoading 속성을 주었을 때 나오는 뼈대(스켈레톤) UI입니다. */
export const LoadingState: Story = {
  name: '스켈레톤(Loading) 상태',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px' }}>
      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>데이터를 불러올 때 노출할 수 있는 스켈레톤 탭</h4>
        <Tab isLoading onChange={() => {}}>
          {/* 로딩 중일 때는 아무거나 넣어두어도, 내부에서 알아서 무시하고 스켈레톤을 그립니다. */}
          <Tab.Item>더미</Tab.Item>
        </Tab>
      </div>
    </div>
  ),
};
