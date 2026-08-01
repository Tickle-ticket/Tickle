import React, { useState, useEffect, useRef } from 'react';
import type { TargetTrackerProps } from '@/src/shared/tracking/useTargetTracker';
import Button from './Button';
import { Box } from './Box';
import type { ButtonProps } from './types';

interface WaitlistButtonProps extends Omit<ButtonProps, 'onClick'> {
  isUpcoming: boolean;
  isMoreThanOneDayLeft?: boolean;
  targetDate?: string;
  onTimerExpire?: () => void;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  /** useTargetTracker가 돌려주는 ref·핸들러 묶음. 버튼 요소에 그대로 펼친다. */
  trackerProps?: TargetTrackerProps;
}

const pad = (n: number) => String(n).padStart(2, '0');

const MiniDigitCell = ({ value, isWarning }: { value: string; isWarning: boolean }) => (
  <span
    className={`relative inline-flex items-center justify-center w-[18px] h-[24px] rounded-[4px] text-[13px] font-extrabold tabular-nums transition-colors duration-300 overflow-hidden
      ${isWarning
        ? 'bg-gradient-to-b from-red-50 to-red-100/80 text-danger border border-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(239,68,68,0.15)]'
        : 'bg-gradient-to-b from-white to-[#eff3ff] text-[#2563eb] border border-[#dbe4ff] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(37,99,235,0.1)]'
      }`}
  >
    <span className={`absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2 ${isWarning ? 'bg-red-200/50' : 'bg-[#dbe4ff]/60'}`} />
    <span className="relative z-10 leading-none">{value}</span>
  </span>
);

const MiniColon = ({ isWarning }: { isWarning: boolean }) => (
  <span className={`flex flex-col gap-[4px] justify-center mx-[2px] ${isWarning ? 'animate-pulse' : ''}`}>
    <span className={`w-[2.5px] h-[2.5px] rounded-full transition-colors duration-300 ${isWarning ? 'bg-danger/60' : 'bg-[#93b4ff]'}`} />
    <span className={`w-[2.5px] h-[2.5px] rounded-full transition-colors duration-300 ${isWarning ? 'bg-danger/60' : 'bg-[#93b4ff]'}`} />
  </span>
);

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
  const [timerExpired, setTimerExpired] = useState(() =>
    targetDate ? new Date(targetDate).getTime() <= Date.now() : false
  );
  const hasExpiredRef = useRef(timerExpired);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  useEffect(() => {
    if (!targetDate) return;
    if (hasExpiredRef.current) return;

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          setTimerExpired(true);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          onTimerExpire?.();
        }
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [targetDate, onTimerExpire]);

  const totalSec = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const isWarning = totalSec > 0 && totalSec <= 10;
  const showTimer = targetDate && !isMoreThanOneDayLeft && !timerExpired;

  return (
    <div className="relative flex-1 flex w-full">
      <Button
        {...trackerProps}
        color="light"
        size="large"
        className={`flex-1 h-14 !rounded-xl !px-0 border border-black/10 transition-all duration-300 shadow-sm z-10 ${isUpcoming ? 'bg-surface-subtle opacity-90 pointer-events-none' : ''}`}
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          if (!isUpcoming && onClick) {
            onClick(e);
          }
        }}
        isLoading={isLoading}
        {...rest}
      >
        {isUpcoming && targetDate ? (
          isMoreThanOneDayLeft ? (
            <span className="font-bold tracking-wider text-[15px]">{formatOpenDate(targetDate)}</span>
          ) : (
            <span className="text-[15px] font-bold tracking-wider text-content">취소표 대기하기</span>
          )
        ) : (
          <span className="font-bold tracking-wider text-[15px]">취소표 대기하기</span>
        )}
      </Button>

      {showTimer && (
        <Box
          variant="flat"
          padding="none"
          className={`absolute left-0 w-full !transition-all !duration-500 !ease-in-out z-0 !rounded-t-none !rounded-b-[14px] !border-t-0 !border-x-black/5 !border-b-black/10 !bg-white/90 backdrop-blur-md shadow-[0_12px_24px_-6px_rgba(0,0,0,0.12),0_4px_8px_-4px_rgba(0,0,0,0.08)]
            ${!timerExpired
              ? 'bottom-0 translate-y-[calc(100%-4px)]'
              : 'bottom-0 translate-y-0 pointer-events-none'
            }`}
        >
          <div className="h-[4px] bg-gradient-to-b from-black/[0.06] to-transparent" />

          <div className="relative flex items-center justify-center py-1.5">
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
            
            <div className="flex items-center justify-center px-4 py-1 bg-gradient-to-b from-[#f3f4f6] to-[#e5e7eb] rounded-full shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.8)] border border-black/[0.02]">
              <span className="text-[11px] font-bold text-[#8b95a1] mr-2 tracking-tight">남은 시간</span>
              
              {timeLeft.days > 0 && (
                <span className={`text-[12px] font-bold mr-1 transition-colors duration-300 ${isWarning ? 'text-danger' : 'text-[#2563eb]'}`}>
                  {timeLeft.days}일
                </span>
              )}

              <div className="flex items-center gap-[3px]">
                <MiniDigitCell value={pad(timeLeft.hours)[0]} isWarning={isWarning} />
                <MiniDigitCell value={pad(timeLeft.hours)[1]} isWarning={isWarning} />
                <MiniColon isWarning={isWarning} />
                <MiniDigitCell value={pad(timeLeft.minutes)[0]} isWarning={isWarning} />
                <MiniDigitCell value={pad(timeLeft.minutes)[1]} isWarning={isWarning} />
                <MiniColon isWarning={isWarning} />
                <MiniDigitCell value={pad(timeLeft.seconds)[0]} isWarning={isWarning} />
                <MiniDigitCell value={pad(timeLeft.seconds)[1]} isWarning={isWarning} />
              </div>
            </div>
          </div>
        </Box>
      )}
    </div>
  );
};
