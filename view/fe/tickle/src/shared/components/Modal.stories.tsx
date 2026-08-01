import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Modal } from './Modal';
import { useState } from 'react';
import React from 'react';

const meta = {
  title: 'Shared/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 500,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean', description: '모달 활성화 여부' },
    title: { control: 'text', description: '모달 제목' },
    description: { control: 'text', description: '모달 본문 설명' },
    cancelText: { control: 'text', description: '취소 버튼 텍스트' },
    confirmText: { control: 'text', description: '확인 버튼 텍스트' },
    isLoading: { control: 'boolean', description: '확인 버튼 로딩 상태' },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

// 템플릿: Storybook 내에서 모달을 켜고 끄기 위한 인터랙티브 래퍼
const InteractiveModal = (args: ComponentProps<typeof Modal>) => {
  // 모달을 바로 보여주기 위해 초기값을 true로 설정하고, 
  // Storybook Controls에서 isOpen 옵션이 넘어오면 그걸 우선적으로 사용합니다.
  const [isOpen, setIsOpen] = useState(args.isOpen ?? true);

  // Storybook 패널에서 isOpen 토글 작동을 동기화
  React.useEffect(() => {
    if (args.isOpen !== undefined) {
      setIsOpen(args.isOpen);
    }
  }, [args.isOpen]);

  return (
    <>
      <Modal 
        {...args} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        onConfirm={() => {
          if (!args.isLoading) {
            setIsOpen(false);
          }
        }}
      />
    </>
  );
};

export const FaceIDExample: Story = {
  name: 'Face ID 등록 예시 (사진 참고)',
  render: InteractiveModal,
  args: {
    title: '"설정" 앱에서 Face ID를 등록해주세요',
    description: '기기에 Face ID가 설정되어야 사용할 수 있어요.',
    cancelText: '확인',
    confirmText: '설정으로 이동',
  },
};

export const SingleButton: Story = {
  name: '버튼 1개 모달',
  render: InteractiveModal,
  args: {
    title: '예매가 완료되었습니다',
    description: '예매 상세 내역은 마이페이지에서 확인하실 수 있습니다.',
    cancelText: '', // 취소 텍스트를 비우면 버튼이 하나만 표시됩니다.
    confirmText: '확인',
  },
};

export const LoadingState: Story = {
  name: '로딩 중인 모달',
  render: InteractiveModal,
  args: {
    title: '티켓 취소 요청',
    description: '정말로 예매를 취소하시겠습니까?\n취소 수수료가 발생할 수 있습니다.',
    cancelText: '아니오',
    confirmText: '네, 취소합니다',
    isLoading: true, // 확인 버튼이 로딩 스피너로 표시됨
  },
};
