import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Title } from './Title';

const meta: Meta<typeof Title> = {
  title: 'Shared/Title',
  component: Title,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: '화면 좌측에 크게 나타나는 주요 제목' },
    leftIcon: { control: 'text', description: 'back, close 등의 상단 네비게이션 아이콘' },
    transparent: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Title>;

/** 토스 특유의 큼지막한 페이지 제목(Title)을 나타냅니다. */
export const Default: Story = {
  args: {
    title: '어떤 계좌로\n송금할까요?',
  },
  render: (args) => (
    <div style={{ paddingBottom: '40px', backgroundColor: '#fff', border: '1px solid #eee' }}>
      <Title {...args} />
    </div>
  ),
};

/** 상단에 뒤로가기 버튼이 함께 있는 페이지 메인 타이틀입니다. */
export const WithBackButton: Story = {
  name: '뒤로가기가 포함된 타이틀',
  args: {
    title: '내 정보 설정',
    leftIcon: 'back',
  },
  render: (args) => (
    <div style={{ paddingBottom: '40px', backgroundColor: '#fff', border: '1px solid #eee' }}>
      <Title {...args} />
    </div>
  ),
};
