import type { Meta, StoryObj } from '@storybook/react';
import { BannerTitle } from './BannerTitle';
import { BannerPoster } from './BannerPoster';

const meta = {
  title: 'Shared/BannerTitle',
  component: BannerTitle,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' }, // 흰색 글씨 확인을 위해 어두운 배경 기본 적용
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: '공연 메인 제목' },
    subtitle: { control: 'text', description: '공연 부제목' },
    date: { control: 'text', description: '공연 일시' },
    venue: { control: 'text', description: '공연 장소' },
    color: { control: 'color', description: '전체 글자 색상 (기본: 흰색)' },
    className: { control: 'text', description: '추가 CSS 클래스' },
  },
} satisfies Meta<typeof BannerTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 형태의 타이틀 */
export const Default: Story = {
  args: {
    title: '오페라의 유령',
    subtitle: 'The Phantom of the Opera Original Cast',
    date: '2026. 05. 01 (금) ~ 2026. 08. 31 (월)',
    venue: '예술의전당 오페라극장',
  },
};


