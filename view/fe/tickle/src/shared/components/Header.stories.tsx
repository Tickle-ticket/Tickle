import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Shared/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '모든 페이지에서 공통으로 사용되는 글로벌 헤더입니다. 로고, 검색바, 프로필 아바타 드롭다운을 포함합니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#f8f8f8', minHeight: '120px', padding: '0 24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

/** 기본 헤더 상태입니다. 검색바와 프로필 아바타가 우측에 표시됩니다. */
export const Default: Story = {};

/** 헤더의 주요 인터랙션 포인트를 보여줍니다. */
export const WithAnnotations: Story = {
  name: '인터랙션 가이드',
  render: () => (
    <div style={{ background: '#f8f8f8', padding: '0 24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#666', padding: '12px 0' }}>
          <span>🔍 <strong>검색바</strong>: 입력 시 실시간 검색 결과 표시</span>
          <span>👤 <strong>아바타</strong>: 클릭 시 마이페이지 드롭다운 메뉴</span>
          <span>🏠 <strong>로고</strong>: 클릭 시 홈으로 이동</span>
        </div>
      </div>
      <Header />
    </div>
  ),
};
