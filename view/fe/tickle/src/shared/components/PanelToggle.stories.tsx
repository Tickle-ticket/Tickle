import type { Meta, StoryObj } from '@storybook/react';
import { PanelToggle } from './PanelToggle';
import { useState } from 'react';

const meta = {
  title: 'Shared/PanelToggle',
  component: PanelToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    side: {
      control: 'radio',
      options: ['left', 'right'],
      description: '사이드바가 위치한 방향 (화살표 및 둥근 모서리 방향 결정)',
    },
    variant: {
      control: 'radio',
      options: ['attached', 'floating'],
      description: '버튼의 시각적 형태 (벽에 붙은 형태 vs 떠있는 원형)',
    },
  },
} satisfies Meta<typeof PanelToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveToggle = (args: any) => {
  const [isFolded, setIsFolded] = useState(false);
  return (
    <div className="relative w-[300px] h-[300px] border border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-4 overflow-hidden">
      <p className="text-sm text-gray-500">클릭하여 상태 전환 테스트</p>
      
      {/* 가상 사이드바 배경 (시각적 피드백용) */}
      <div 
        className={`absolute top-0 bottom-0 bg-white dark:bg-zinc-800 shadow-md transition-all duration-500 ${
          args.side === 'right' 
            ? `right-0 ${isFolded ? 'w-0' : 'w-20'}`
            : `left-0 ${isFolded ? 'w-0' : 'w-20'}`
        }`} 
      />

      <PanelToggle 
        isFolded={isFolded} 
        onToggle={() => setIsFolded(!isFolded)} 
        {...args}
      />
    </div>
  );
};

export const DefaultLeftAttached: Story = {
  render: (args) => <InteractiveToggle {...args} />,
  args: {
    side: 'left',
    variant: 'attached',
  },
};

export const RightFloating: Story = {
  render: (args) => <InteractiveToggle {...args} />,
  args: {
    side: 'right',
    variant: 'floating',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    isFolded: false,
    className: '!static !translate-y-0 !translate-x-0',
  },
};
