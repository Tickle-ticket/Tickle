import type { Meta, StoryObj } from '@storybook/react';
import { BannerTitle } from './BannerTitle';
import { BannerSubtitle } from './BannerSubtitle';
import { BannerPlace } from './BannerPlace';
import { BannerTime } from './BannerTime';

const meta = {
  title: 'Shared/BannerTitleGroup',
  component: BannerTitle,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#18181b' }, // 아연(zinc) 900
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
} satisfies Meta<typeof BannerTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

// 4개의 컴포넌트를 조립해서 보여주는 스토리
export const FullGroup: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-1 p-8 bg-zinc-900 rounded-lg">
      <BannerSubtitle subtitle="단독판매" color={args.color} />
      <BannerTitle {...args} />
      <BannerPlace place="블루스퀘어 신한카드홀" color={args.color} />
      <BannerTime time="2024.03.15 ~ 2024.05.15" color={args.color} />
    </div>
  ),
  args: {
    title: '오페라의 유령',
    color: '#ffffff',
  },
};

export const TitleOnly: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-1 p-8 bg-zinc-900 rounded-lg">
      <BannerTitle {...args} />
    </div>
  ),
  args: {
    title: '오페라의 유령',
    color: '#ffffff',
  },
};

export const LoadingState: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-1 p-8 bg-zinc-900 rounded-lg">
      <BannerSubtitle subtitle="단독판매" isLoading />
      <BannerTitle title="오페라의 유령" isLoading />
      <BannerPlace place="블루스퀘어 신한카드홀" isLoading />
      <BannerTime time="2024.03.15 ~ 2024.05.15" isLoading />
    </div>
  ),
};
