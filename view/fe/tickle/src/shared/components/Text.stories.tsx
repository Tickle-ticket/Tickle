import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Shared/Text',
  component: Text,
  tags: ['autodocs'],
  argTypes: {
    typography: { control: 'select', options: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'] },
    color: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'blue', 'red', 'white', 'gray'] },
    fontWeight: { control: 'select', options: ['regular', 'medium', 'semibold', 'bold'] },
    textAlign: { control: 'select', options: ['left', 'center', 'right'] },
    ellipsis: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

/** 가장 범용적인 크기인 t5(16px) 기본 텍스트입니다. */
export const Default: Story = {
  args: {
    children: '새로운 금융, 토스',
    typography: 't5',
  },
};

/** 토스 앱에서 쓰이는 7가지 글자 계층(크기)입니다. */
export const Typography: Story = {
  name: '타이포그래피 계층 (T1 ~ T7)',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      <Text typography="t1">T1 (24px, Bold) - 메인 화면의 큰 인사말</Text>
      <Text typography="t2">T2 (22px, Bold) - 주요 섹션 강조 제목</Text>
      <Text typography="t3">T3 (20px, Bold) - 중간 제목</Text>
      <Text typography="t4">T4 (18px, Medium) - 일반 항목 제목</Text>
      <Text typography="t5">T5 (16px, Regular) - 가장 기본이 되는 본문</Text>
      <Text typography="t6">T6 (14px, Regular) - 부가적인 작은 본문</Text>
      <Text typography="t7">T7 (12px, Regular) - 날짜 정보, 약관, 경고 등 가장 작은 글씨</Text>
    </div>
  ),
};

/** 토스 스타일의 폰트 색상을 확인합니다. */
export const Colors: Story = {
  name: '색상 가이드',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#f9f9f9' }}>
      <Text typography="t4" color="primary" fontWeight="bold">Primary (gray-900) - 시선이 꽂히는 주요 텍스트</Text>
      <Text typography="t4" color="secondary">Secondary (gray-600) - 보조 텍스트 (본문)</Text>
      <Text typography="t4" color="tertiary">Tertiary (gray-400) - 덜 중요한 정보, 날짜 등</Text>
      <Text typography="t4" color="blue" fontWeight="bold">Blue (blue-500) - 토스의 상징적인 강조색, 성공</Text>
      <Text typography="t4" color="red">Red (red-500) - 에러, 잔액 부족, 위험</Text>
    </div>
  ),
};

/** 데이터가 도착하기 전 렌더링을 지연시킬 때 사용하는 스켈레톤(뼈대) UI 입니다. */
export const LoadingState: Story = {
  name: '스켈레톤(로딩) 상태',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      <Text typography="t2" isLoading={true} style={{ width: '8em' }} />
      <Text typography="t5" isLoading={true} style={{ width: '15em' }} />
      <Text typography="t5" isLoading={true} style={{ width: '12em' }} />
      <Text typography="t7" isLoading={true} style={{ width: '6em' }} />
    </div>
  ),
};
