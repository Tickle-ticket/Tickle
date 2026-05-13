'use client';

import React from 'react';
import { Text } from '@/src/shared/components/Text';



export const PastBookingsView = () => {
  return (
    <div className="w-full animate-fade-in flex flex-col items-center justify-center py-20 px-4 mt-8 bg-surface-subtle rounded-3xl border border-line shadow-sm">
      <div className="w-20 h-20 mb-6 bg-primary-light rounded-full flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4l3 3"></path>
        </svg>
      </div>
      <Text typography="t4" fontWeight="bold" className="text-content mb-2 text-center">
        과거 예매 조회 페이지는 준비 중입니다.
      </Text>
      <Text typography="t6" className="text-content-tertiary text-center max-w-md leading-relaxed">
        더 나은 서비스 제공을 위해 지난 관람 내역을 한눈에 볼 수 있는 기능을 열심히 준비하고 있습니다. 조금만 기다려 주세요!
      </Text>
    </div>
  );
};
