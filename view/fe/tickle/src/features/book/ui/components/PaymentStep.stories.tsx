import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PaymentStep } from './PaymentStep';
import { useBookStore } from '../../store/useBookStore';

const meta: Meta<typeof PaymentStep> = {
  title: 'user/PaymentStep',
  component: PaymentStep,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => {
      // Initialize store for the story
      const { setBookingStep, setPriceGradeTicketCounts } = useBookStore.getState();
      // Use setTimeout to ensure this runs outside the render cycle if needed, or just set it
      React.useEffect(() => {
        setBookingStep('PAYMENT');
        setPriceGradeTicketCounts({
          VIP: { '일반': 1 },
          R: { '일반': 1 }
        });
      }, []);

      return (
        <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
          {/* Header Mock for context since PaymentStep expects to be below header */}
          <div className="h-[73px] bg-white border-b border-gray-200 flex items-center px-6 font-bold">
            Header Mock
          </div>
          <Story />
        </div>
      );
    },
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PaymentStep>;

export const Default: Story = {
  args: {
    optionsData: {
      seats: [{ priceGrade: 'VIP', seatLabel: 'A열 1번' }, { priceGrade: 'R', seatLabel: 'B열 2번' }] as any,
      totalTicketPriceAmount: 150000,
      totalCount: 2,
    },
    preorderBookingId: 1,
    eventId: '1',
    scheduleId: '1',
    userId: 1,
    userProfile: { name: '홍길동', email: 'test@test.com', phoneNumber: '010-1234-5678' },
    onCancel: () => {},
    onConflictError: () => {},
    onError: () => {},
    storyMode: true,
  },
};

export const Mobile: Story = {
  ...Default,
  parameters: {
    viewport: { defaultViewport: 'iphone14' },
    layout: 'fullscreen',
  },
};

export const Tablet: Story = {
  ...Default,
  parameters: {
    viewport: { defaultViewport: 'ipad' },
    layout: 'fullscreen',
  },
};
