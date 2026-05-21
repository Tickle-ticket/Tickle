import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Shared/SearchBar',
  component: SearchBar,
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text', description: '비어 있을 때 보여줄 힌트 텍스트' },
    fullWidth: { control: 'boolean', description: '부모 너비를 100% 꽉 채울지 여부' },
    isLoading: { control: 'boolean', description: '스켈레톤(회색 막대기) 로딩 상태' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

/** 첨부해주신 검색창 이미지와 가장 흡사한 기본 예시입니다. 클릭해서 파란색 테두리를 확인해보세요! */
export const Default: Story = {
  args: {
    placeholder: '검색어를 입력해보세요',
  },
};

/** 검색창의 여러가지 작동 상태(값이 있을 때/없을 때/로딩 중일 때) 모음입니다. */
export const States: Story = {
  name: '검색창 상태 비교',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', padding: '20px' }}>
      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>1. 입력 대기 상태</h4>
        <SearchBar placeholder="검색어를 입력하세요" />
      </div>

      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>2. 값 입력 완료 (우측 X 버튼 노출)</h4>
        <SearchBar defaultValue="ㅇㅁㄹㅋㄴ" placeholder="검색어를 입력하세요" />
      </div>

      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>3. 스켈레톤 로딩 중 (isLoading)</h4>
        <SearchBar isLoading />
      </div>
    </div>
  ),
};

/** fullWidth 속성을 주었을 때 어떻게 유연하게 늘어나는지 보여줍니다. */
export const FullWidth: Story = {
  name: '전체 너비 100% 채우기',
  render: () => (
    <div style={{ width: '100%', border: '1px dashed #ccc', padding: '20px', borderRadius: '8px' }}>
      <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>가로 화면을 꽉 채우는 화면 상단용 검색바</h4>
      <SearchBar fullWidth placeholder="긴 주소나 상세한 내용을 여기서 타건하세요." />
    </div>
  ),
};
