import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Accordion } from './Accordion';
import React from 'react';

const meta = {
  title: 'Shared/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: '아코디언 제목' },
    defaultOpen: { control: 'boolean', description: '초기 열림 상태 여부' },
    isOpen: { control: 'boolean', description: '제어 모드 열림 상태 강제 제어' },
    isLoading: { control: 'boolean', description: '로딩 스켈레톤 상태' },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '닫힌 토글 (아코디언)',
    children: '열린 토글의 상세 내용입니다. 토스 스타일로 튕기듯이 부드럽게 열리고 닫히는 모션이 적용되어 있습니다.',
  },
  render: (args) => (
    <div className="w-[400px]">
      <Accordion {...args} />
    </div>
  )
};

export const Open: Story = {
  args: {
    title: '열린 토글',
    defaultOpen: true,
    children: '우측의 화살표가 위쪽을 향하고 있으며, 텍스트 상자가 매끄럽게 펼쳐진 상태입니다.',
  },
  render: (args) => (
    <div className="w-[400px]">
      <Accordion {...args} />
    </div>
  )
};

export const Multiple: Story = {
  render: () => (
    <div className="w-full max-w-xl mx-auto bg-surface p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-line-subtle">
      <Accordion title="토스 스타일 애니메이션">
        CSS Grid를 이용한 0fr ➔ 1fr 트랜지션을 사용하여, 내부 높이가 얼마든 상관없이 부드럽게 자연스럽게 열립니다! JS 계산이 필요치 않아 성능도 우수합니다.
      </Accordion>
      <Accordion title="화살표(Chevron) 모션">
        우측의 쉐브론 화살표 역시 모션과 함께 돌아가며, 활성화 시 토스 파란색(#3182F6)으로 점등되어 인지력을 높여줍니다.
      </Accordion>
      <Accordion title="제어와 비제어 동시 지원">
        useState를 내부적으로 기본 지원하며, 부모 컴포넌트에서 강제로 닫거나 제어할 수 있도록 isOpen/onToggle 속성도 완벽 지원합니다.
      </Accordion>
    </div>
  )
};

export const LoadingState: Story = {
  render: () => (
    <div className="w-full max-w-xl mx-auto">
      <Accordion title="" isLoading={true}>로딩</Accordion>
      <Accordion title="" isLoading={true}>로딩</Accordion>
      <Accordion title="" isLoading={true}>로딩</Accordion>
    </div>
  )
};
