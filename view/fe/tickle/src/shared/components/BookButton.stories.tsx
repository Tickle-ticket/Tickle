import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookButton } from './BookButton';
import { WaitlistButton } from './WaitlistButton';
import React, { useState } from 'react';

const meta = {
  title: 'Shared/BookButton',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const getFutureDate = (seconds: number) => {
  const d = new Date();
  d.setSeconds(d.getSeconds() + seconds);
  return d.toISOString();
};

const ActionButtonsContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center w-[540px] gap-2 p-4 bg-[#f8f8f8] rounded-xl border border-black/5 shadow-sm">
    {children}
  </div>
);

// 1. 일반 버전
export const Normal: Story = {
  render: () => (
    <ActionButtonsContainer>
      <BookButton isUpcoming={false} onClick={() => alert('예매하기 클릭!')} />
      <WaitlistButton isUpcoming={false} onClick={() => alert('취소표 대기하기 클릭!')} />
    </ActionButtonsContainer>
  )
};

// 2. 타이머가 돌아가는 버전 (1시간 남음)
export const TimerRunning: Story = {
  render: () => {
    const [targetDate] = useState(() => getFutureDate(3600));
    const [waitlistTargetDate] = useState(() => getFutureDate(3600 + 600)); // 10 minutes later
    return (
      <ActionButtonsContainer>
        <BookButton isUpcoming={true} targetDate={targetDate} />
        <WaitlistButton isUpcoming={true} targetDate={waitlistTargetDate} />
      </ActionButtonsContainer>
    );
  }
};

// 3. 타이머가 1분 미만 남은 버전 (30초 남음)
export const TimerWarning: Story = {
  render: () => {
    const [targetDate] = useState(() => getFutureDate(30));
    const [waitlistTargetDate] = useState(() => getFutureDate(30 + 600));
    return (
      <ActionButtonsContainer>
        <BookButton isUpcoming={true} targetDate={targetDate} />
        <WaitlistButton isUpcoming={true} targetDate={waitlistTargetDate} />
      </ActionButtonsContainer>
    );
  }
};

// 4. 00초가 됐을 때 (3초 후 만료되어 테두리 돌아감)
export const TimerExpire: Story = {
  render: () => {
    const [targetDate] = useState(() => getFutureDate(3));
    const [waitlistTargetDate] = useState(() => getFutureDate(5)); // waitlist expires a bit later for demo
    const [isBookUpcoming, setIsBookUpcoming] = useState(true);
    const [isWaitlistUpcoming, setIsWaitlistUpcoming] = useState(true);
    return (
      <div className="flex flex-col items-center">
        <ActionButtonsContainer>
          <BookButton 
            isUpcoming={isBookUpcoming} 
            targetDate={targetDate} 
            onTimerExpire={() => setIsBookUpcoming(false)} 
          />
          <WaitlistButton 
            isUpcoming={isWaitlistUpcoming} 
            targetDate={waitlistTargetDate} 
            onTimerExpire={() => setIsWaitlistUpcoming(false)} 
          />
        </ActionButtonsContainer>
        <p className="mt-4 text-sm text-gray-500 text-center">
          3초 후 예매하기 타이머가 종료되며 애니메이션이 나타납니다.<br/>
          5초 후 취소표 대기하기 타이머가 종료됩니다.
        </p>
      </div>
    );
  }
};
