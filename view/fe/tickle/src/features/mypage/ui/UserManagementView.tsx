'use client';

import { useRouter } from 'next/navigation';

import React, { useState } from 'react';
import { Box } from '@/src/shared/components/Box';
import { Title } from '@/src/shared/components/Title';
import { Text } from '@/src/shared/components/Text';
import { Avatar } from '@/src/shared/components/Avatar';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { useUserProfile, useUpdateUserProfile, useWithdrawUser } from '@/src/shared/api/useUserProfile';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

export const UserManagementView = () => {
  const router = useRouter();
  const { closeMypage } = useMypageStore();
  const { data, isLoading } = useUserProfile();
  const updateProfileMutation = useUpdateUserProfile();
  const withdrawMutation = useWithdrawUser();
  
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(data?.nickname || data?.name || '티클유저');
  
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(data?.phoneNumber || '010-0000-0000');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // 프로필 이미지 변경 모의 함수
  const handleProfileImageChange = () => {
    // 실제로는 파일 입력을 받거나 이미지 업로드 API를 타야 하지만, 임시로 랜덤 아바타 URL을 주입합니다.
    const newRandomAvatar = `https://i.pravatar.cc/150?u=${Math.random().toString(36).substring(7)}`;
    updateProfileMutation.mutate({ profileImageUrl: newRandomAvatar });
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      {/* 1. 회원 정보 (프로필 카드) */}
      <Box variant="flat" padding="large" className="w-full border border-black/5 bg-[#fcfcfc]">
        <div className="flex flex-col md:flex-row items-center gap-10 w-full">
          {/* Avatar Section */}
          <div className="relative group shrink-0">
            <Avatar 
              size={100} 
              src={data?.avatarUrl || ''} 
              isLoading={isLoading} 
            />
            {/* 사진 변경 버튼 */}
            <button 
              onClick={handleProfileImageChange}
              disabled={updateProfileMutation.isPending}
              className="absolute bottom-0 right-0 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-blue-500 hover:text-blue-600 hover:scale-105 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
          </div>

          {/* User Info Fields */}
          <div className="flex flex-col gap-4 w-full max-w-lg">
            {/* 닉네임 */}
            <Box variant="outline" padding="small" className="flex items-center gap-4 w-full h-14 !rounded-xl shadow-sm transition-all hover:shadow-md hover:border-blue-200">
              <div className="w-20 shrink-0">
                <Text typography="t6" fontWeight="bold" color="tertiary">닉네임</Text>
              </div>
              <div className="flex-1">
                {isEditingNickname ? (
                  <input 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    className="w-full text-[18px] font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent pb-1 focus:border-blue-600 transition-colors"
                    autoFocus
                  />
                ) : (
                  <Text typography="t4" fontWeight="bold" color="primary" className="!text-[18px]">{nickname}</Text>
                )}
              </div>
              <button 
                onClick={() => {
                  if (isEditingNickname) {
                    updateProfileMutation.mutate({ nickname });
                  }
                  setIsEditingNickname(!isEditingNickname);
                }}
                className={`text-sm font-bold px-2 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                  isEditingNickname 
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100" 
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title="수정"
              >
                {isEditingNickname ? (
                  <span className="px-1">저장</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                )}
              </button>
            </Box>

            {/* 전화번호 (수정 가능) */}
            <Box variant="outline" padding="small" className="flex items-center gap-4 w-full h-14 !rounded-xl shadow-sm transition-all hover:shadow-md hover:border-blue-200">
              <div className="w-20 shrink-0">
                <Text typography="t6" fontWeight="bold" color="tertiary">전화번호</Text>
              </div>
              <div className="flex-1">
                {isEditingPhone ? (
                  <input 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="w-full text-[18px] font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent pb-1 focus:border-blue-600 transition-colors"
                    autoFocus
                    placeholder="010-0000-0000"
                  />
                ) : (
                  <Text typography="t4" fontWeight="bold" color="primary" className="!text-[18px]">{phoneNumber}</Text>
                )}
              </div>
              <button 
                onClick={() => {
                  if (isEditingPhone) {
                    updateProfileMutation.mutate({ phoneNumber });
                  }
                  setIsEditingPhone(!isEditingPhone);
                }}
                className={`text-sm font-bold px-2 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                  isEditingPhone 
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100" 
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title="수정"
              >
                {isEditingPhone ? (
                  <span className="px-1">저장</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                )}
              </button>
            </Box>
          </div>
        </div>
      </Box>

      {/* 2. 회원 액션 (비밀번호 변경, 고객 지원 등) */}
      <Box variant="flat" padding="none" className="w-full border border-black/5 overflow-hidden flex flex-col">
        <button className="flex items-center justify-between w-full p-5 hover:bg-gray-50 transition-colors border-b border-gray-100">
          <Text typography="t5" fontWeight="bold" color="primary">비밀번호 변경</Text>
          <Text typography="t6" color="tertiary">›</Text>
        </button>
        <button 
          onClick={() => {
            closeMypage();
            router.push('/support/faq');
          }}
          className="flex items-center justify-between w-full p-5 hover:bg-gray-50 transition-colors border-b border-gray-100"
        >
          <Text typography="t5" fontWeight="bold" color="primary">고객 지원 (FAQ)</Text>
          <Text typography="t6" color="tertiary">›</Text>
        </button>
        <button 
          onClick={() => setIsWithdrawModalOpen(true)}
          className="flex items-center justify-between w-full p-5 hover:bg-red-50 transition-colors group"
        >
          <Text typography="t5" fontWeight="bold" className="text-red-500 group-hover:text-red-600 transition-colors">회원 탈퇴</Text>
          <Text typography="t6" className="text-red-300">›</Text>
        </button>
      </Box>

      {/* 회원 탈퇴 모달 */}
      <Modal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="회원 탈퇴"
        description="정말로 회원을 탈퇴하시겠습니까? 탈퇴 후에는 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다."
        confirmText="탈퇴하기"
        cancelText="취소"
        onConfirm={() => {
          withdrawMutation.mutate();
        }}
        isLoading={withdrawMutation.isPending}
      />
    </div>
  );
};
