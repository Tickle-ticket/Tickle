import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Shared/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'xlarge'],
      description: '아바타 크기 (기본 프리셋)',
    },
    src: {
      control: 'text',
      description: '이미지 URL (값이 없거나 엑박이 뜨면 기본 토스 스타일 아이콘 노출)',
    },
    isLoading: {
      control: 'boolean',
      description: '로딩 상태 (회색 원형 스켈레톤 애니메이션)',
    },
  },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

/** 가장 기본이 되는 토스(Toss) 스타일 프로필입니다. */
export const Default: Story = {
  args: {
    size: 'medium',
  },
};

/** 크기별 아바타를 비교하는 매트릭스입니다. */
export const Sizes: Story = {
  name: '크기 비교 (Sizes)',
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-end', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Avatar size="small" />
        <span style={{ fontSize: '12px', color: '#666' }}>small (32px)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Avatar size="medium" />
        <span style={{ fontSize: '12px', color: '#666' }}>medium (48px)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Avatar size="large" />
        <span style={{ fontSize: '12px', color: '#666' }}>large (64px)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Avatar size="xlarge" />
        <span style={{ fontSize: '12px', color: '#666' }}>xlarge (80px)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Avatar size={120} />
        <span style={{ fontSize: '12px', color: '#666' }}>custom (120px)</span>
      </div>
    </div>
  ),
};

/** 실제 이미지가 있는 경우, 없는 경우, 에러난 경우, 로딩 중인 경우의 비교입니다. */
export const States: Story = {
  name: '상태 비교 (이미지, 에러, 스켈레톤)',
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <Avatar size="large" src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" />
        <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>정상 이미지 사진</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <Avatar size="large" src="https://this-is-wrong-url.com/error.jpg" />
        <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>이미지 로딩 에러<br />(기본 아이콘 대체)</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <Avatar size="large" isLoading />
        <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>스켈레톤 (isLoading)</span>
      </div>
    </div>
  ),
};
