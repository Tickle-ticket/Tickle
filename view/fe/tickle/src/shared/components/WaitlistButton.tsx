import React, { useState } from 'react';
import Button from './Button';
import { CountdownTimer } from './CountdownTimer';
import type { ButtonProps } from './types';

interface WaitlistButtonProps extends Omit<ButtonProps, 'onClick'> {
  isUpcoming: boolean;
  isMoreThanOneDayLeft?: boolean;
  targetDate?: string;
  onTimerExpire?: () => void;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  trackerProps?: any;
}

export const WaitlistButton = ({
  isUpcoming,
  isMoreThanOneDayLeft = false,
  targetDate,
  onTimerExpire,
  onClick,
  isLoading,
  trackerProps,
  ...rest
}: WaitlistButtonProps) => {
  const [justOpened, setJustOpened] = useState(false);

  const formatOpenDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}.${day}(${dayOfWeek}) ${hours}:${minutes}`;
  };

  const handleExpire = () => {
    setJustOpened(true);
    setTimeout(() => {
      setJustOpened(false);
    }, 600);
    if (onTimerExpire) {
      onTimerExpire();
    }
  };

  return (
    <Button
      {...trackerProps}
      color="light"
      size="large"
      className={`relative flex-1 flex items-center justify-center h-14 !rounded-xl !px-0 border border-black/10 transition-all duration-300 shadow-sm !overflow-visible ${isUpcoming ? 'bg-surface-subtle opacity-90 pointer-events-none' : ''}`}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        if (!isUpcoming && onClick) {
          onClick(e);
        }
      }}
      isLoading={isLoading}
      {...rest}
    >
      {justOpened && (
        <span className="absolute inset-0 rounded-xl z-0 pointer-events-none bg-danger animate-flash-red" />
      )}
      {isUpcoming && targetDate ? (
        isMoreThanOneDayLeft ? (
          <span className="relative z-10 font-bold tracking-wider text-[15px]">{formatOpenDate(targetDate)}</span>
        ) : (
          <>
            <span className="relative z-10 text-[15px] font-bold tracking-wider text-content">취소표 대기하기</span>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center bg-white rounded-md px-2 py-0.5 border border-black/10 shadow-md text-content scale-[0.85] z-10 whitespace-nowrap">
              <CountdownTimer 
                targetDate={targetDate} 
                onExpire={handleExpire} 
                variant="compact" 
              />
            </div>
          </>
        )
      ) : (
        <span className="relative z-10 font-bold tracking-wider text-[15px]">취소표 대기하기</span>
      )}
    </Button>
  );
};
