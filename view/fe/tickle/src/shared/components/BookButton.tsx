import React, { useState } from 'react';
import Button from './Button';
import { CountdownTimer } from './CountdownTimer';
import type { ButtonProps } from './types';

interface BookButtonProps extends Omit<ButtonProps, 'onClick'> {
  isUpcoming: boolean;
  isMoreThanOneDayLeft?: boolean;
  targetDate?: string;
  onTimerExpire?: () => void;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  trackerProps?: any;
}

export const BookButton = ({
  isUpcoming,
  isMoreThanOneDayLeft = false,
  targetDate,
  onTimerExpire,
  onClick,
  isLoading,
  trackerProps,
  ...rest
}: BookButtonProps) => {
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
      color="dark"
      size="large"
      className={`relative flex-1 flex items-center justify-center h-14 !rounded-xl !px-0 transition-all duration-300 shadow-sm !overflow-visible ${isUpcoming ? 'opacity-80 pointer-events-none bg-surface-inverse' : ''}`}
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
            <span className="relative z-10 text-[15px] font-bold tracking-wider">예매하기</span>
            <div 
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center rounded-md px-2 py-0.5 border border-white/10 shadow-md text-white scale-[0.85] z-10 whitespace-nowrap"
              style={{ backgroundColor: 'var(--toss-grey-700)' }}
            >
              <CountdownTimer 
                targetDate={targetDate} 
                onExpire={handleExpire} 
                variant="compact" 
              />
            </div>
          </>
        )
      ) : (
        <span className="relative z-10 font-bold tracking-wider text-[15px]">예매하기</span>
      )}
    </Button>
  );
};
