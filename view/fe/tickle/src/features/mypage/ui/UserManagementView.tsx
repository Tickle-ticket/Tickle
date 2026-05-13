'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/src/shared/components/Avatar';
import { Box } from '@/src/shared/components/Box';
import { Modal } from '@/src/shared/components/Modal';
import { Text } from '@/src/shared/components/Text';
import { useUserProfile, useWithdrawUser } from '@/src/shared/api/useUserProfile';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

const getErrorStatus = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

export const UserManagementView = () => {
  const router = useRouter();
  const { closeMypage } = useMypageStore();
  const { data, isLoading } = useUserProfile();
  const withdrawMutation = useWithdrawUser();

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState({ isOpen: false, title: '', message: '' });

  return (
    <div className="flex w-full flex-col gap-8 animate-fade-in">
      <Box variant="flat" padding="large" className="w-full border border-black/5 bg-[#fcfcfc]">
        <div className="flex w-full flex-col items-center gap-10 md:flex-row">
          <div className="relative shrink-0">
            <Avatar size={100} src={data?.avatarUrl || ''} isLoading={isLoading} />
          </div>

          <div className="flex w-full max-w-xl flex-col gap-4">
            <Box variant="outline" padding="small" className="flex min-h-[56px] w-full items-center gap-4 py-3 !rounded-xl shadow-sm">
              <div className="w-20 shrink-0">
                <Text typography="t6" fontWeight="bold" color="tertiary">이름</Text>
              </div>
              <Text typography="t4" fontWeight="bold" color="primary" className="break-all">
                {data?.realName || '-'}
              </Text>
            </Box>

            <Box variant="outline" padding="small" className="flex min-h-[56px] w-full items-center gap-4 py-3 !rounded-xl shadow-sm">
              <div className="w-20 shrink-0">
                <Text typography="t6" fontWeight="bold" color="tertiary">이메일</Text>
              </div>
              <Text typography="t5" color="secondary" className="break-all">
                {data?.email || '-'}
              </Text>
            </Box>
          </div>
        </div>
      </Box>

      {/* 2. 회원 액션 (고객 지원 등) */}
      <Box variant="flat" padding="none" className="w-full border border-black/5 overflow-hidden flex flex-col">
        <Link
          href="/support/faq"
          onClick={(e) => {
            // 라우팅이 완전히 시작되도록 약간의 지연 후 전역 상태 초기화
            setTimeout(() => {
              closeMypage();
            }, 150);
          }}
          className="flex w-full items-center border-b border-line-subtle p-5 text-left transition-colors hover:bg-surface-subtle"
        >
          <Text typography="t5" fontWeight="bold" color="primary">고객 지원 (FAQ)</Text>
        </Link>
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="group flex w-full items-center p-5 text-left transition-colors hover:bg-danger-subtle"
        >
          <Text typography="t5" fontWeight="bold" className="text-danger group-hover:text-danger">회원 탈퇴</Text>
        </button>
      </Box>

      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="회원 탈퇴"
        description="정말로 회원을 탈퇴하시겠습니까? 탈퇴 후에는 계정 정보를 복구할 수 없습니다."
        confirmText="탈퇴하기"
        cancelText="취소"
        onConfirm={() => {
          withdrawMutation.mutate(undefined, {
            onError: (error) => {
              setIsWithdrawModalOpen(false);
              const status = getErrorStatus(error);
              if (status === 404) {
                setNoticeModal({ isOpen: true, title: '사용자 없음', message: '사용자 정보를 찾을 수 없습니다.' });
                return;
              }
              setNoticeModal({ isOpen: true, title: '오류 발생', message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
            },
          });
        }}
        isLoading={withdrawMutation.isPending}
      />

      <Modal
        isOpen={noticeModal.isOpen}
        onClose={() => setNoticeModal({ ...noticeModal, isOpen: false })}
        title={noticeModal.title}
        description={noticeModal.message}
        confirmText="확인"
        showCancelButton={false}
        onConfirm={() => setNoticeModal({ ...noticeModal, isOpen: false })}
      />
    </div>
  );
};
