'use client';

import React, { useState } from 'react';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { useUpdateUserProfile, useUserProfile } from '@/src/shared/api/useUserProfile';

const NICKNAME_PATTERN = /^[A-Za-z가-힣0-9]+$/;

const countCharacters = (value: string) => Array.from(value.trim()).length;

const getNicknameError = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '닉네임을 입력해 주세요.';
  }

  if (countCharacters(trimmedValue) > 20) {
    return '닉네임은 20자 이하로 입력해 주세요.';
  }

  if (!NICKNAME_PATTERN.test(trimmedValue)) {
    return '닉네임에는 한글, 영문, 숫자만 사용할 수 있습니다.';
  }

  return '';
};

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

  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [errors, setErrors] = useState({ nickname: '', phone: '' });
  const [noticeModal, setNoticeModal] = useState({ isOpen: false, title: '', message: '' });

  const nickname = nicknameDraft ?? data?.nickname ?? data?.name ?? '';
  const phone = phoneDraft ?? data?.phoneNumber ?? '';
  const isDirty = nickname !== (data?.nickname ?? data?.name ?? '') || phone !== (data?.phoneNumber ?? '');

  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\s+/g, '').slice(0, 20);
    setNicknameDraft(value);
    setErrors((prev) => ({ ...prev, nickname: '' }));
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 11);
    setPhoneDraft(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = {
      nickname: getNicknameError(nickname),
      phone: getPhoneError(phone),
    };
    setErrors(nextErrors);

    if (nextErrors.nickname || nextErrors.phone) {
      return;
    }

    updateProfileMutation.mutate(
      { nickname: nickname.trim(), phoneNumber: phone },
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
    <div className="flex w-full flex-col gap-8 animate-fade-in">
      <Box variant="flat" padding="large" className="w-full border border-black/5 bg-[#fcfcfc]">
        <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-6">
          <Input
            label="닉네임"
            name="nickname"
            placeholder="닉네임을 입력해 주세요."
            autoComplete="nickname"
            maxLength={20}
            fullWidth
            required
            value={nickname}
            onChange={handleNicknameChange}
            onBlur={() => setErrors((prev) => ({ ...prev, nickname: getNicknameError(nickname) }))}
            error={errors.nickname}
          />

          <Input
            label="휴대폰번호"
            type="tel"
            name="phone"
            placeholder="01012345678"
            autoComplete="tel"
            inputMode="numeric"
            fullWidth
            required
            value={phone}
            onChange={handlePhoneChange}
            onBlur={() => setErrors((prev) => ({ ...prev, phone: getPhoneError(phone) }))}
            error={errors.phone}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              size="large"
              disabled={!isDirty}
              isLoading={updateProfileMutation.isPending}
            >
              저장
            </Button>
          </div>
        </form>
      </Box>

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
