import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Shared/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: '입력창 위의 라벨 텍스트' },
    error: { control: 'text', description: '에러 발생 시 보여줄 붉은 텍스트' },
    placeholder: { control: 'text', description: '값이 없을 때 보여줄 힌트 텍스트' },
    fullWidth: { control: 'boolean', description: '가로 너비 전체 채움 (100%) 여부' },
    disabled: { control: 'boolean', description: '비활성화 여부' },
    isLoading: { control: 'boolean', description: '로딩(스켈레톤) 상태 여부' }
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

/** 첨부해주신 이미지와 가장 유사한 기본 상태입니다. */
export const Default: Story = {
  args: {
    label: '휴대폰 번호',
    value: '010',
    placeholder: '- 없이 숫자만 입력',
  },
};

/** Input 컴포넌트가 가질 수 있는 다양한 상태(에러, 설정, 스켈레톤 등)를 모아둔 매트릭스입니다. */
export const States: Story = {
  name: '입력창 상태 비교',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', width: '320px', padding: '20px' }}>
      <Input 
        label="기본 (입력 대기)" 
        placeholder="01012345678" 
      />
      
      <Input 
        label="값 입력 됨" 
        value="010" 
      />
      
      <Input 
        label="에러 발생" 
        value="010-ABCD" 
        error="숫자만 입력 가능합니다." 
      />
      
      <Input 
        label="비활성화 (Disabled)" 
        value="010-1234-5678" 
        disabled 
        className="opacity-50 cursor-not-allowed"
      />

      <Input 
        label="스켈레톤 변환 중" 
        isLoading
      />
    </div>
  ),
};

/** fullWidth 옵션 적용 모습입니다. */
export const FullWidth: Story = {
  name: '전체 너비 (Full Width)',
  render: () => (
    <div style={{ width: '100%', border: '1px dashed #ccc', padding: '20px' }}>
      <Input 
        label="긴 주소 입력 가능" 
        fullWidth 
        placeholder="상세 주소를 입력해주세요" 
      />
    </div>
  ),
};
