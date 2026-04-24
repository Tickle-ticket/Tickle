'use client';

import React, { useState, useEffect, useCallback } from 'react';

import Lottie from 'lottie-react';
import checkedAnimation from '@/src/shared/lottle/Checked.json';

export interface CustomCAPTCHAProps {
  onSuccess: (token: string) => void;
  onClose?: () => void;
}

export const CustomCAPTCHA = ({ onSuccess, onClose }: CustomCAPTCHAProps) => {
  const [keypad, setKeypad] = useState<number[]>([]);
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [currentInput, setCurrentInput] = useState<number[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // 파생 상태: 입력한 숫자 중 하나라도 정답과 틀리면 에러
  const isError = currentInput.some((num, idx) => num !== targetSequence[idx]);

  // 미션 생성 및 키패드 섞기
  const generateMission = useCallback(() => {
    // 1. 1~9 무작위 셔플 배열 생성 (봇이 좌표를 외우지 못하도록)
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setKeypad(nums);

    // 2. 미션으로 제시할 3개의 숫자 무작위 추출
    const availableMissions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = availableMissions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableMissions[i], availableMissions[j]] = [availableMissions[j], availableMissions[i]];
    }
    
    // 단순하게 3개 숫자 순서대로 누르기
    const seq = availableMissions.slice(0, 3);

    setTargetSequence(seq);
    setCurrentInput([]);
    setIsSuccess(false);
  }, []);

  useEffect(() => {
    generateMission();
  }, [generateMission]);

  const handleKeyPress = (num: number) => {
    if (isSuccess || isError || currentInput.length >= targetSequence.length) return;

    const nextInput = [...currentInput, num];
    setCurrentInput(nextInput);

    // 3개를 모두 입력했을 때 정답인지 확인
    if (nextInput.length === targetSequence.length) {
      const isWrong = nextInput.some((val, idx) => val !== targetSequence[idx]);
      if (!isWrong) {
        setIsSuccess(true);
      }
    }
  };

  const handleDelete = () => {
    if (isSuccess || currentInput.length === 0) return;
    setCurrentInput((prev) => prev.slice(0, -1));
  };

  // 진행률 계산
  const progress = targetSequence.length > 0 ? (currentInput.length / targetSequence.length) * 100 : 0;

  if (keypad.length === 0) return null;

  return (
    <div className={`relative flex flex-col items-center bg-white p-6 rounded-2xl shadow-xl border w-full max-w-sm transition-colors duration-300 min-h-[440px] ${isError ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
      
      {/* 닫기 버튼 */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-20"
          aria-label="닫기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      {/* 상태 아이콘 & 타이틀 */}
      <div className="flex flex-col items-center mb-4 z-10">
        <h2 className={`text-xl font-bold ${isError ? 'text-red-600' : 'text-gray-900'}`}>
          {isSuccess ? '인증 완료' : isError ? '잘못된 입력입니다' : '보안 인증'}
        </h2>
      </div>

      {/* 내부 콘텐츠 (성공 시 투명해지되 공간 유지) */}
      <div className={`w-full flex flex-col transition-opacity duration-300 ${isSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* 미션 지시문 */}
        <div className="w-full bg-gray-50 rounded-xl p-5 mb-5 text-center border border-gray-100 flex flex-col gap-4">
          <p className="text-sm font-bold text-gray-800">다음 숫자를 순서대로 누르세요</p>
          
          <div className="flex items-center justify-center gap-3">
            {targetSequence.map((num, idx) => {
              const isCompleted = currentInput.length > idx && currentInput[idx] === num;
              const isWrongSpot = currentInput.length > idx && currentInput[idx] !== num;

              return (
                <React.Fragment key={`${num}-${idx}`}>
                  <span className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg transition-colors ${
                    isCompleted 
                      ? 'bg-blue-500 text-white shadow-inner border-transparent' 
                      : isWrongSpot
                        ? 'bg-red-500 text-white shadow-inner border-transparent'
                        : 'bg-white text-blue-600 shadow-sm border border-blue-100'
                  }`}>
                    {num}
                  </span>
                  {idx < targetSequence.length - 1 && <span className="text-gray-300">➡</span>}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* 진행 상황 바 */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full transition-all duration-300 ${isError ? 'bg-red-500' : 'bg-blue-500'}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        {/* 3x3 키패드 + 지우기 버튼 */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keypad.map((num) => {
            const isPressed = currentInput.includes(num);

            return (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={isPressed || isSuccess || isError || currentInput.length >= targetSequence.length}
                className={`
                  aspect-square rounded-xl text-2xl font-bold transition-all duration-200
                  ${isPressed
                    ? 'bg-blue-50 text-blue-300 shadow-none border border-transparent scale-95' 
                    : 'bg-white text-gray-700 shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95'
                  }
                  disabled:opacity-50 disabled:pointer-events-none
                `}
              >
                {num}
              </button>
            );
          })}
          
          <button
            onClick={handleDelete}
            disabled={isSuccess || currentInput.length === 0}
            className="col-span-3 mt-2 py-3.5 rounded-xl text-base font-bold transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="지우기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
              <line x1="18" y1="9" x2="12" y2="15"></line>
              <line x1="12" y1="9" x2="18" y2="15"></line>
            </svg>
            <span>지우기</span>
          </button>
        </div>
      </div>

      {/* 성공 시 로티 애니메이션 오버레이 */}
      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-20">
          <div className="w-48 h-48">
            <Lottie 
              animationData={checkedAnimation} 
              loop={false} 
              onComplete={() => onSuccess(`custom-captcha-token-${Date.now()}`)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
