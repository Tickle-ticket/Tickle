import type { Meta, StoryObj } from '@storybook/react';
import { PerformanceBanner } from './PerformanceBanner';

const meta = {
  title: 'Shared/PerformanceBanner',
  component: PerformanceBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text', description: '포스터 배경 이미지 URL' },
    title: { control: 'text', description: '공연 메인 제목' },
    subtitle: { control: 'text', description: '공연 부제목' },
    date: { control: 'text', description: '공연 일시' },
    venue: { control: 'text', description: '공연 장소' },
    color: { control: 'color', description: '글자 색상 (기본: 흰색)' },
    width: { control: 'text', description: '가로 길이' },
    height: { control: 'text', description: '세로 길이' },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof PerformanceBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1507676184212-d0330a158638?q=80&w=2000&auto=format&fit=crop',
    title: '오페라의 유령',
    subtitle: '오리지널 내한공연',
    date: '2026. 05. 01 ~ 2026. 05. 31',
    venue: '샤롯데씨어터',
    currentBadge: 1,
    totalBadge: 5,
    isLoading: false,
  },
};

export const LongText: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1507676184212-d0330a158638?q=80&w=2000&auto=format&fit=crop',
    title: '오페라의 유령 - 25주년 기념 특별 내한 앙코르 초대형 스펙터클 한정판 공연',
    subtitle: '브로드웨이 오리지널 캐스트와 아시아 투어를 마친 전 세계 흥행 1위 뮤지컬의 역사적인 귀환, 단 4주간의 역대급 무대',
    date: '2026년 5월 1일 (금요일) 시작하여 ~ 2026년 8월 31일 (월요일) 까지 진행되는 유례없는 특별 공연 릴레이',
    venue: '예술의전당 오페라극장 대공연장 특설무대 (서울특별시 서초구 남부순환로 2406)',
  },
};

export const LoadingState: Story = {
  args: {
    src: '',
    title: '',
    isLoading: true,
  },
};
