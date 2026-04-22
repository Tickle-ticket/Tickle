import type { Meta, StoryObj } from '@storybook/react';
import { BannerPoster } from './BannerPoster';

const meta = {
  title: 'Shared/BannerPoster',
  component: BannerPoster,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text', description: '포스터 이미지 URL' },
    alt: { control: 'text', description: '포스터 이미지 대체 텍스트' },
    width: { control: 'text', description: '포스터 가로 길이 (예: 100%, 500px)' },
    height: { control: 'text', description: '포스터 세로 길이 (예: 100vh, 400px)' },
    className: { control: 'text', description: '추가 CSS 클래스' },
  },
} satisfies Meta<typeof BannerPoster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=2952&auto=format&fit=crop',
    alt: '설산 포스터',
  },
};



