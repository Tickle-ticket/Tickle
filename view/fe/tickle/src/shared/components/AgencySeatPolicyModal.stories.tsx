import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import {
  AgencySeatPolicyModal,
  createDefaultAgencySeatPolicy,
  type AgencySeatPolicy,
} from './AgencySeatPolicyModal';

const meta = {
  title: 'Agency/SeatPolicyModal',
  component: AgencySeatPolicyModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-100 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AgencySeatPolicyModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function SeatPolicyModalStory({
  initialSeatPolicy = createDefaultAgencySeatPolicy(),
}: {
  initialSeatPolicy?: AgencySeatPolicy;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [seatPolicy, setSeatPolicy] = useState<AgencySeatPolicy>(initialSeatPolicy);

  return (
    <div className="flex min-h-[720px] items-center justify-center">
      <button
        type="button"
        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
        onClick={() => setIsOpen(true)}
      >
        좌석 등급 설정 열기
      </button>

      {isOpen ? (
        <AgencySeatPolicyModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          seatPolicy={seatPolicy}
          onConfirm={setSeatPolicy}
        />
      ) : null}
    </div>
  );
}

export const Default: Story = {
  render: () => <SeatPolicyModalStory />,
};

export const WithDisabledSeats: Story = {
  render: () => {
    const seatPolicy = createDefaultAgencySeatPolicy();
    seatPolicy.C1 = 'disabled';
    seatPolicy.C2 = 'disabled';
    seatPolicy.P15 = 'disabled';
    seatPolicy.P16 = 'disabled';

    return <SeatPolicyModalStory initialSeatPolicy={seatPolicy} />;
  },
};
