import React from 'react';
import { Title } from './Title';
import { Text } from './Text';
import { Button } from './Button';
import type { ErrorViewProps, ErrorType } from './types';

const IllustrationBase = ({ children, colorClass }: { children: React.ReactNode; colorClass: string }) => (
  <div className={`w-[120px] h-[120px] mx-auto rounded-full flex items-center justify-center mb-8 ${colorClass}`}>
    {children}
  </div>
);

const Icon404 = () => (
  <IllustrationBase colorClass="bg-[#dbeafe] text-[#3b82f6]">
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="M11 8a1.5 1.5 0 0 1 1 2.5c-.7.5-.7 1.25-.7 1.25" />
      <circle cx="11" cy="14" r="0.5" fill="currentColor" />
    </svg>
  </IllustrationBase>
);

const Icon500 = () => (
  <IllustrationBase colorClass="bg-[#fee2e2] text-[#ef4444]">
    <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </IllustrationBase>
);

const Icon401 = () => (
  <IllustrationBase colorClass="bg-[#f3f4f6] text-[#6b7280]">
    <svg width="46" height="46" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  </IllustrationBase>
);

const IconTimeout = () => (
  <IllustrationBase colorClass="bg-[#fef3c7] text-[#f59e0b]">
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  </IllustrationBase>
);

const IconSoldOut = () => (
  <IllustrationBase colorClass="bg-[#f3e8ff] text-[#a855f7]">
    <svg width="50" height="50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7z" />
      <line x1="16" y1="5" x2="16" y2="19" strokeDasharray="3 3" />
      <line x1="7" y1="10" x2="11" y2="14" />
      <line x1="11" y1="10" x2="7" y2="14" />
    </svg>
  </IllustrationBase>
);

const CONFIG: Record<ErrorType, { title: string; description: string; actionText: string; icon: React.ReactNode }> = {
  '404': {
    title: '페이지를 찾을 수 없어요',
    description: '빈 무대만 남아있습니다. 주소가 올바른지 확인해주세요.',
    actionText: '홈으로 돌아가기',
    icon: <Icon404 />
  },
  '500': {
    title: '일시적인 서버 오류입니다',
    description: '티켓팅 열기로 인해 서버가 지쳤습니다. 잠시 후 다시 시도해주세요.',
    actionText: '새로고침',
    icon: <Icon500 />
  },
  '401': {
    title: '접근 권한이 없습니다',
    description: '로그인이 필요하거나 잘못된 접근입니다.',
    actionText: '안전하게 로그인하기',
    icon: <Icon401 />
  },
  'timeout': {
    title: '결제 시간이 초과되었습니다',
    description: '아쉽게도 지정된 결제 시간이 만료되어 좌석이 취소되었습니다.',
    actionText: '다시 예매하기',
    icon: <IconTimeout />
  },
  'soldout': {
    title: '이미 매진된 좌석입니다',
    description: '다른 분이 한발 빠르게 좌석을 차지했습니다.',
    actionText: '다른 좌석 골라보기',
    icon: <IconSoldOut />
  }
};

export const ErrorView = ({
  type,
  title,
  description,
  actionText,
  onAction,
  className = ''
}: ErrorViewProps) => {
  const defaults = CONFIG[type];

  const finalTitle = title || defaults.title;
  const finalDescription = description || defaults.description;
  const finalActionText = actionText || defaults.actionText;

  // 에러 타입에 따라 메인 버튼 색상 분기 (Toss-style)
  let buttonColor: 'primary' | 'danger' | 'dark' | 'light' = 'primary';
  if (type === '500') buttonColor = 'danger';
  else if (type === '401') buttonColor = 'dark';
  // 404, timeout, soldout은 보통 primary로 유도

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 w-full min-h-[60vh] bg-white ${className}`}>
      {defaults.icon}

      <div className="flex flex-col items-center text-center gap-3 max-w-[400px]">
        <Title title={finalTitle} className="text-[24px] md:text-[28px] tracking-tight m-0" />
        <Text typography="t5" color="tertiary" textAlign="center" className="leading-relaxed whitespace-pre-wrap">
          {finalDescription}
        </Text>
      </div>

      <div className="w-full max-w-[280px] mt-10">
        <Button 
          display="block" 
          color={buttonColor} 
          onClick={onAction}
          size="large"
        >
          {finalActionText}
        </Button>
      </div>
    </div>
  );
};
