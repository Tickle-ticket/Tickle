import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpire?: () => void;
  variant?: 'default' | 'compact';
}

export const CountdownTimer = ({ targetDate, onExpire, variant = 'default' }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const onExpireRef = React.useRef(onExpire);
  onExpireRef.current = onExpire;
  const hasExpiredRef = React.useRef(false);

  useEffect(() => {
    // 이미 만료된 경우 즉시 처리
    if (new Date(targetDate).getTime() <= Date.now()) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - Date.now();

      if (difference <= 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpireRef.current?.();
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const result = calculateTimeLeft();
      setTimeLeft(result);
      if (hasExpiredRef.current) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (num: number) => String(num).padStart(2, '0');

  if (variant === 'compact') {
    const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
    
    // 0초가 되면 타이머 자체를 숨김
    if (totalSeconds <= 0) return null;
    
    const isWarning = totalSeconds <= 900;

    const timeString = (
      <>
        {timeLeft.days > 0 ? <span className="mr-1">{timeLeft.days}일</span> : null}
        {pad(timeLeft.hours)} : {pad(timeLeft.minutes)} : {pad(timeLeft.seconds)}
      </>
    );

    return (
      <span className="font-mono font-bold tracking-normal text-[14px] whitespace-nowrap relative">
        <span className={isWarning ? 'invisible' : ''}>{timeString}</span>
        {isWarning && (
          <span className="absolute -top-[3px] -bottom-[3px] -left-[9px] -right-[9px] bg-danger text-white flex items-center justify-center rounded-md z-20 border border-danger">
            {timeString}
          </span>
        )}
      </span>
    );
  }

  const TimeUnit = ({ value, label }: { value: number; label: string }) => {
    const padded = pad(value);
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <div className="w-10 h-14 bg-[#1a1c23] rounded-md border border-[#2a2d36] flex items-center justify-center relative overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/50 z-10 -translate-y-1/2"></div>
            <span className="text-2xl font-black text-white z-0">{padded[0]}</span>
          </div>
          <div className="w-10 h-14 bg-[#1a1c23] rounded-md border border-[#2a2d36] flex items-center justify-center relative overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/50 z-10 -translate-y-1/2"></div>
            <span className="text-2xl font-black text-white z-0">{padded[1]}</span>
          </div>
        </div>
        <span className="text-[10px] font-extrabold text-[#8a8d98] tracking-wider">{label}</span>
      </div>
    );
  };

  const Colon = () => (
    <div className="flex flex-col justify-center h-14 pb-5 px-1">
      <span className="text-white/60 font-black text-xl">:</span>
    </div>
  );

  return (
    <div className="inline-flex bg-[#0f111a] p-4 rounded-xl border border-[#2a2d36] shadow-xl">
      <div className="flex items-end gap-1">
        <TimeUnit value={timeLeft.days} label="DAYS" />
        <Colon />
        <TimeUnit value={timeLeft.hours} label="HRS" />
        <Colon />
        <TimeUnit value={timeLeft.minutes} label="MIN" />
        <Colon />
        <TimeUnit value={timeLeft.seconds} label="SEC" />
      </div>
    </div>
  );
};
