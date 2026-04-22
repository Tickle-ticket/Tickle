import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Shared/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    as: {
      control: 'select',
      options: ['button', 'a', 'div', 'span'],
      description: '렌더링할 HTML 태그',
    },
    color: {
      control: 'select',
      options: ['primary', 'danger', 'dark', 'light'],
      description: '버튼 색상',
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'HTML 버튼 타입 (form 내부 동작)',
    },
    htmlStyle: {
      control: 'object',
      description: '추가로 적용할 인라인 CSS 스타일 객체',
    },
    variant: {
      control: 'select',
      options: ['fill', 'weak'],
      description: '버튼 바탕 채움 스타일',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'xlarge'],
      description: '버튼 크기',
    },
    display: {
      control: 'select',
      options: ['inline', 'block', 'full'],
      description: '버튼 표시 형태(길이)',
    },
    isLoading: {
      control: 'boolean',
      description: '로딩 상태 애니메이션 여부',
    },
    disabled: {
      control: 'boolean',
      description: '클릭 비활성화 여부',
    },
    children: {
      control: 'text',
      description: '버튼 내 텍스트',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/** 기본 버튼 형태 */
export const Default: Story = {
  args: {
    children: '기본 버튼',
    color: 'primary',
    variant: 'fill',
    size: 'medium',
  },
};

/** 색상과 스타일에 따른 조합 매트릭스 */
export const Variants: Story = {
  name: '색상 및 스타일 조합',
  render: () => {
    const colors = ['primary', 'danger', 'dark', 'light'] as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
        <div>
          <h3 style={{ marginBottom: '12px' }}>Fill Variant</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {colors.map(color => (
              <Button key={`fill-${color}`} variant="fill" color={color}>
                {color} fill
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: '12px' }}>Weak Variant</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {colors.map(color => (
              <Button key={`weak-${color}`} variant="weak" color={color}>
                {color} weak
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  },
};

/** 버튼 크기에 따른 비교 */
export const Sizes: Story = {
  name: '사이즈 비교',
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button size="small">Small (32px)</Button>
      <Button size="medium">Medium (40px)</Button>
      <Button size="large">Large (48px)</Button>
      <Button size="xlarge">XLarge (56px)</Button>
    </div>
  ),
};

/** Display(너비)에 따른 형태 비교 */
export const Displays: Story = {
  name: '길이/너비 속성',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Button display="inline">Inline Button</Button>
      <Button display="block">Block Button (w-full width round)</Button>
      <Button display="full">Full Button (w-full, no-radius)</Button>
    </div>
  ),
};

/** 버튼 상태 (로딩 & 비활성화) */
export const States: Story = {
  name: '로딩 및 비활성화 상태',
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Button isLoading>처리 중</Button>
      <Button disabled>비활성화 됨</Button>
      <Button color="danger" variant="weak" isLoading>삭제 중</Button>
    </div>
  ),
};
