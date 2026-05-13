'use client';

import React, { useState } from 'react';
import { Avatar } from '@/src/shared/components/Avatar';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { useUpdateUserProfile, useUserProfile } from '@/src/shared/api/useUserProfile';

const getPhoneError = (value: string) => {
  if (!value.trim()) {
    return '휴대폰 번호를 입력해 주세요.';
  }

  if (!/^010\d{8}$/.test(value)) {
    return '휴대폰 번호를 올바르게 입력해 주세요. 예: 01012345678';
  }

  return '';
};

const getErrorStatus = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

export const ProfileEditView = () => {
  const { data } = useUserProfile();
  const updateProfileMutation = useUpdateUserProfile();

  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [errors, setErrors] = useState({ phone: '' });
  const [noticeModal, setNoticeModal] = useState({ isOpen: false, title: '', message: '' });

  const phone = phoneDraft ?? data?.phoneNumber ?? '';
  const isDirty = phone !== (data?.phoneNumber ?? '');

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 11);
    setPhoneDraft(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    updateProfileMutation.mutate(
      { profileImage: file },
      {
        onSuccess: () => {
          setNoticeModal({ isOpen: true, title: '변경 완료', message: '프로필 이미지가 변경되었습니다.' });
        },
        onError: (error) => {
          const status = getErrorStatus(error);
          if (status === 400) {
            setNoticeModal({ isOpen: true, title: '입력값 확인', message: '지원하지 않는 이미지 형식이거나 용량이 초과되었습니다.' });
            return;
          }
          if (status === 404) {
            setNoticeModal({ isOpen: true, title: '사용자 없음', message: '사용자 정보를 찾을 수 없습니다.' });
            return;
          }
          setNoticeModal({ isOpen: true, title: '오류 발생', message: '프로필 이미지 변경 중 오류가 발생했습니다.' });
        },
      },
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = {
      phone: getPhoneError(phone),
    };
    setErrors(nextErrors);

    if (nextErrors.phone) {
      return;
    }

    updateProfileMutation.mutate(
      { phoneNumber: phone },
      {
        onSuccess: () => {
          setNoticeModal({ isOpen: true, title: '변경 완료', message: '내 정보가 변경되었습니다.' });
        },
        onError: (error) => {
          const status = getErrorStatus(error);
          if (status === 400) {
            setNoticeModal({ isOpen: true, title: '입력값 확인', message: '입력 형식이 올바르지 않습니다.' });
            return;
          }
          if (status === 404) {
            setNoticeModal({ isOpen: true, title: '사용자 없음', message: '사용자 정보를 찾을 수 없습니다.' });
            return;
          }
          setNoticeModal({ isOpen: true, title: '오류 발생', message: '내 정보 변경 중 오류가 발생했습니다.' });
        },
      },
    );
  };

  return (
    <div className="flex w-full flex-col items-center py-2 md:py-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-surface rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-line-subtle p-6 md:p-8 relative overflow-hidden">

        {/* 프로필 이미지 플레이스홀더 및 수정 */}
        <div className="flex flex-col items-center mb-6 mt-0">
          <div className="relative group rounded-full border-4 border-line-subtle shadow-sm transition-all hover:shadow-md mb-4">
            <div className="overflow-hidden rounded-full">
              <Avatar size={96} src={data?.avatarUrl || ''} isLoading={false} />
            </div>
            
            {/* 호버 시 나타나는 오버레이 (사진 수정) */}
            <label className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer ${updateProfileMutation.isPending ? 'pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
                disabled={updateProfileMutation.isPending}
              />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span className="text-white text-xs font-bold tracking-wide">편집</span>
            </label>
            
            {/* 기본 우측 하단 아이콘 (호버 전에도 변경 가능함을 알림) */}
            <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary shadow-sm pointer-events-none group-hover:opacity-0 transition-opacity">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="3"></circle>
              </svg>
            </div>
          </div>
          
          <h3 className="text-xl font-black text-content tracking-tight">{data?.realName || data?.name || '사용자'}</h3>
          <p className="text-[14px] font-medium text-content-muted mt-1">{data?.email || '이메일 정보 없음'}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          {/* iOS 스타일 폼 그룹 */}
          <div className="flex flex-col rounded-2xl border border-line bg-surface shadow-sm overflow-hidden mb-5">
            {/* 이름 입력 */}
            <div className="flex items-center px-4 py-1.5 border-b border-line-subtle focus-within:bg-primary-subtle/20 transition-colors relative">
              <label htmlFor="name" className="w-20 text-[14px] font-bold text-content-secondary shrink-0">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                disabled
                readOnly
                value={data?.realName ?? data?.name ?? ''}
                className="flex-1 py-3 bg-transparent outline-none text-[15px] font-semibold tracking-tight text-content-muted cursor-not-allowed"
              />
            </div>

            {/* 휴대폰번호 입력 */}
            <div className="flex items-center px-4 py-1.5 focus-within:bg-primary-subtle/20 transition-colors relative">
              <label htmlFor="phone" className="w-20 text-[14px] font-bold text-content-secondary shrink-0">
                연락처
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01012345678"
                autoComplete="tel"
                inputMode="numeric"
                required
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setErrors((prev) => ({ ...prev, phone: getPhoneError(phone) }))}
                className={`flex-1 py-3 bg-transparent outline-none text-[15px] font-semibold tracking-tight ${errors.phone ? 'text-danger' : 'text-content'} placeholder:text-content-muted placeholder:font-normal`}
              />
              {errors.phone && (
                <div className="absolute top-full left-0 mt-0.5 text-[11px] text-danger font-medium px-4 z-10">
                  {errors.phone}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Button
              type="submit"
              size="large"
              className={`w-full rounded-2xl font-bold text-[15px] transition-all duration-300 ${isDirty ? 'bg-primary hover:bg-primary-hover shadow-lg shadow-blue-600/30 transform hover:-translate-y-0.5 text-white' : 'bg-surface-muted text-content-muted'}`}
              disabled={!isDirty}
              isLoading={updateProfileMutation.isPending}
            >
              내 정보 저장하기
            </Button>
            
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  setPhoneDraft(null);
                  setErrors({ phone: '' });
                }}
                className="w-full py-2.5 rounded-2xl font-bold text-[14px] text-content-tertiary hover:text-content hover:bg-surface-subtle transition-colors"
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </div>

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
