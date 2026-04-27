'use client';

import React, { useState } from 'react';
import { Box } from '@/src/shared/components/Box';
import { Title } from '@/src/shared/components/Title';
import { Text } from '@/src/shared/components/Text';
import { Avatar } from '@/src/shared/components/Avatar';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { useUserProfile } from '@/src/shared/api/useUserProfile';

export const UserManagementView = () => {
  const { data, isLoading } = useUserProfile();
  
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(data?.name || '티클유저');
  
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(data?.email || 'user@tickle.com');

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
            <button className="absolute bottom-0 right-0 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-blue-500 hover:text-blue-600 hover:scale-105 transition-all">
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
                onClick={() => setIsEditingNickname(!isEditingNickname)}
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

            {/* 이메일 */}
            <Box variant="outline" padding="small" className="flex items-center gap-4 w-full h-14 !rounded-xl shadow-sm transition-all hover:shadow-md hover:border-blue-200">
              <div className="w-20 shrink-0">
                <Text typography="t6" fontWeight="bold" color="tertiary">이메일</Text>
              </div>
              <div className="flex-1">
                {isEditingEmail ? (
                  <input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full text-[18px] font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent pb-1 focus:border-blue-600 transition-colors"
                    autoFocus
                  />
                ) : (
                  <Text typography="t4" fontWeight="bold" color="primary" className="!text-[18px]">{email}</Text>
                )}
              </div>
              <button 
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                className={`text-sm font-bold px-2 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                  isEditingEmail 
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100" 
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title="수정"
              >
                {isEditingEmail ? (
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
        <button className="flex items-center justify-between w-full p-5 hover:bg-gray-50 transition-colors border-b border-gray-100">
          <Text typography="t5" fontWeight="bold" color="primary">고객 지원 (FAQ)</Text>
          <Text typography="t6" color="tertiary">›</Text>
        </button>
        <button className="flex items-center justify-between w-full p-5 hover:bg-red-50 transition-colors group">
          <Text typography="t5" fontWeight="bold" className="text-red-500 group-hover:text-red-600 transition-colors">회원 탈퇴</Text>
          <Text typography="t6" className="text-red-300">›</Text>
        </button>
      </Box>
    </div>
  );
};
