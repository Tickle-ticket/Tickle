import type { Meta, StoryObj } from '@storybook/react';
import { WaitlistSeatCard } from './WaitlistSeatCard';

const meta = {
  title: 'Shared/WaitlistSeatCard',
  component: WaitlistSeatCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl mx-auto">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WaitlistSeatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSeatInfo = {
  id: 'WAIT-1',
  info: 'VIP석 A구역 1열 1번',
  eventTitle: '티클 콘서트 2026',
  eventDate: '2026-06-23T19:30:00Z',
};

export const Offered: Story = {
  name: '배정 완료 (결제 가능)',
  args: {
    seat: {
      ...mockSeatInfo,
      waitlistNumber: 0,
      status: 'OFFERED',
      cancellationOfferId: 1,
    },
    onSelectOffer: () => console.log('onSelectOffer'),
    onCancel: () => console.log('onCancel'),
  },
};

export const Rank1To3: Story = {
  name: '대기 2번째 (곧 내 차례)',
  args: {
    seat: {
      ...mockSeatInfo,
      waitlistNumber: 2,
      status: 'WAITING',
      cancellationOfferId: null,
    },
    onSelectOffer: () => console.log('onSelectOffer'),
    onCancel: () => console.log('onCancel'),
  },
};

export const Rank4To10: Story = {
  name: '대기 7번째 (대기 중)',
  args: {
    seat: {
      ...mockSeatInfo,
      waitlistNumber: 7,
      status: 'WAITING',
      cancellationOfferId: null,
    },
    onSelectOffer: () => console.log('onSelectOffer'),
    onCancel: () => console.log('onCancel'),
  },
};

export const Rank11Plus: Story = {
  name: '대기 25번째 (느긋하게 대기)',
  args: {
    seat: {
      ...mockSeatInfo,
      waitlistNumber: 25,
      status: 'WAITING',
      cancellationOfferId: null,
    },
    onSelectOffer: () => console.log('onSelectOffer'),
    onCancel: () => console.log('onCancel'),
  },
};
