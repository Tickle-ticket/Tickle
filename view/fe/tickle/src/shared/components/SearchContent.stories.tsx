import type { Meta, StoryObj } from '@storybook/react';
import { SearchContent } from './SearchContent';

const meta: Meta<typeof SearchContent> = {
  title: 'Shared/SearchContent',
  component: SearchContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '검색 결과를 그리드 형태로 보여주는 공용 컴포넌트입니다. 검색어를 전달하면 MSW/백엔드에서 결과를 조회하여 InfoCard 목록을 렌더링합니다.',
      },
    },
  },
  argTypes: {
    query: {
      control: 'text',
      description: '검색할 키워드 (빈 문자열이면 "결과 없음" 표시)',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#f8f8f8', minHeight: '400px', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchContent>;

/** 기본 검색 결과 화면입니다. MSW가 활성화되어 있으면 mock 데이터가 표시됩니다. */
export const Default: Story = {
  args: {
    query: '뮤지컬',
  },
};

/** 검색 결과가 없는 경우입니다. */
export const NoResults: Story = {
  name: '검색 결과 없음',
  args: {
    query: 'zzzzzzzzzzz존재하지않는검색어',
  },
};

/** 다양한 검색어의 비교입니다. */
export const MultipleQueries: Story = {
  name: '다양한 검색어 비교',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', background: '#f8f8f8', padding: '24px' }}>
      <div>
        <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#888' }}>1. "콘서트" 검색</h4>
        <SearchContent query="콘서트" />
      </div>
      <div>
        <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#888' }}>2. "밴드" 검색</h4>
        <SearchContent query="밴드" />
      </div>
    </div>
  ),
};
