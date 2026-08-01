import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Shared/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xsmall', 'small', 'medium', 'large'],
      description: '뱃지 크기',
    },
    color: {
      control: 'select',
      options: ['blue', 'red', 'grey', 'green'],
      description: '뱃지 색상',
    },
    variant: {
      control: 'select',
      options: ['fill', 'outline'],
      description: '뱃지 스타일 (채우기/외곽선)',
    },
    fullWidth: {
      control: 'boolean',
      description: '전체 너비 사용 여부',
    },
    isLoading: {
      control: 'boolean',
      description: '로딩(스켈레톤) 상태 여부',
    },
    maxLength: {
      control: 'number',
      description: '텍스트 최대 길이 (초과 시 말줄임)',
    },
    children: {
      control: 'text',
      description: '뱃지 내용',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

/** 기본 뱃지 */
export const Default: Story = {
  args: {
    children: '뱃지',
    size: 'medium',
    color: 'blue',
    variant: 'fill',
  },
};

/** 모든 색상 비교 (Fill) */
export const AllColorsFill: Story = {
  name: '색상 전체 (Fill)',
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge color="blue">Blue</Badge>
      <Badge color="red">Red</Badge>
      <Badge color="grey">Grey</Badge>
      <Badge color="green">Green</Badge>
    </div>
  ),
};

/** 모든 색상 비교 (Outline) */
export const AllColorsOutline: Story = {
  name: '색상 전체 (Outline)',
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge color="blue" variant="outline">Blue</Badge>
      <Badge color="red" variant="outline">Red</Badge>
      <Badge color="grey" variant="outline">Grey</Badge>
      <Badge color="green" variant="outline">Green</Badge>
    </div>
  ),
};

/** Fill vs Outline 비교 */
export const VariantComparison: Story = {
  name: 'Fill vs Outline',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {(['blue', 'red', 'grey', 'green'] as const).map((color) => (
        <div key={color} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge color={color} variant="fill">{color} fill</Badge>
          <Badge color={color} variant="outline">{color} outline</Badge>
        </div>
      ))}
    </div>
  ),
};

/** 사이즈 비교 */
export const Sizes: Story = {
  name: '사이즈 전체',
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge size="xsmall">XSmall</Badge>
      <Badge size="small">Small</Badge>
      <Badge size="medium">Medium</Badge>
      <Badge size="large">Large</Badge>
    </div>
  ),
};

/** maxLength 초과 시 텍스트 잘림 */
export const Truncated: Story = {
  name: '텍스트 말줄임 (maxLength=5)',
  args: {
    children: '아주긴뱃지텍스트입니다',
    maxLength: 5,
    color: 'blue',
    variant: 'fill',
  },
};

/** maxLength 미초과 시 텍스트 그대로 표시 */
export const NotTruncated: Story = {
  name: '텍스트 말줄임 안됨 (짧은 텍스트)',
  args: {
    children: '짧음',
    maxLength: 5,
    color: 'blue',
    variant: 'fill',
  },
};

/** fullWidth 뱃지 */
export const FullWidth: Story = {
  name: '전체 너비',
  render: () => (
    <div style={{ width: '300px', border: '1px dashed #ccc', padding: '8px' }}>
      <Badge fullWidth color="green">Full Width Badge</Badge>
    </div>
  ),
};

/** className으로 커스텀 스타일 적용 */
export const CustomClassName: Story = {
  name: '커스텀 className',
  args: {
    children: '커스텀',
    className: 'shadow-md',
    color: 'red',
    variant: 'fill',
  },
};

/** 종합 매트릭스: 모든 색상 × 모든 사이즈 × 모든 variant */
export const FullMatrix: Story = {
  name: '전체 조합 매트릭스',
  render: () => {
    const colors = ['blue', 'red', 'grey', 'green'] as const;
    const sizes = ['xsmall', 'small', 'medium', 'large'] as const;
    const variants = ['fill', 'outline'] as const;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {variants.map((variant) => (
          <div key={variant}>
            <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#555' }}>
              {variant.toUpperCase()}
            </h3>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 12px', textAlign: 'left', fontSize: '12px', color: '#999' }} />
                  {sizes.map((size) => (
                    <th key={size} style={{ padding: '4px 12px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color) => (
                  <tr key={color}>
                    <td style={{ padding: '4px 12px', fontSize: '12px', color: '#999' }}>{color}</td>
                    {sizes.map((size) => (
                      <td key={size} style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <Badge color={color} size={size} variant={variant}>
                          {color}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  },
};

/** 데이터 로딩 시 보여줄 스켈레톤 컴포넌트 */
export const SkeletonState: Story = {
  name: '로딩 상태 스켈레톤',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#555' }}>기본 사이즈별</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge isLoading size="xsmall" />
          <Badge isLoading size="small" />
          <Badge isLoading size="medium" />
          <Badge isLoading size="large" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#555' }}>Full Width 스켈레톤</h3>
        <div style={{ width: '300px', border: '1px dashed #ccc', padding: '8px' }}>
          <Badge isLoading fullWidth size="medium" />
        </div>
      </div>
    </div>
  ),
};
