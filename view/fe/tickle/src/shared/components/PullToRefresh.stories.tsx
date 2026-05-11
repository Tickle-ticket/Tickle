import type { Meta, StoryObj } from '@storybook/react';
import { PullToRefresh } from './PullToRefresh';
import React from 'react';

const meta = {
  title: 'Shared/PullToRefresh',
  component: PullToRefresh,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full h-screen bg-gray-100 flex flex-col">
        {/* 가짜 모바일 상단 바 */}
        <div className="h-12 bg-white flex items-center justify-center font-bold border-b z-[70] relative shrink-0">
          TIKKLE
        </div>
        <div className="flex-1 relative overflow-hidden">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PullToRefresh>;

export default meta;
type Story = StoryObj<typeof meta>;

// 더미 콘텐츠 컴포넌트
const DummyContent = () => (
  <div className="p-4 space-y-4 pb-20">
    <h1 className="text-2xl font-black text-gray-800 mb-6">마우스로 당겨보세요!</h1>
    {[1, 2, 3, 4, 5, 6, 7].map((item) => (
      <div key={item} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
        <div className="w-20 h-24 bg-gray-200 rounded-lg animate-pulse shrink-0" />
        <div className="flex flex-col gap-2 flex-1 pt-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mt-auto animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const Default: Story = {
  args: {
    onRefresh: async () => {
      // 2초 동안 로딩 대기하여 애니메이션을 감상할 수 있게 함
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('새로고침 완료!');
    },
    children: <DummyContent />,
  },
};
