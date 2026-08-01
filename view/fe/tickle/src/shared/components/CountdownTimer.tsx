import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpire?: () => void;
  variant?: 'default' | 'compact';
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const CountdownTimer = ({ targetDate, onExpire, variant = 'default', containerClassName, containerStyle }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  // onExpire를 아래 타이머 effect의 의존성에 넣으면, 부모가 인라인 함수를 넘길 때
  // 매 렌더마다 타이머가 재시작된다. ref로 최신 값만 들고 있는다.
  //
  // 갱신을 렌더 본문이 아니라 effect에서 하는 이유: 렌더는 여러 번 실행되거나
  // 버려질 수 있어(동시성 모드) 그 시점의 쓰기가 화면에 반영된다는 보장이 없다.
  const onExpireRef = React.useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

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
    
    // 부드러운 슬라이드 업 애니메이션을 위해 0초가 되어도 DOM에서 즉시 제거하지 않음
    // if (totalSeconds <= 0) return null;
    
    const isWarning = totalSeconds <= 900;

    const timeString = (
      <div className="flex items-center gap-1.5 font-bold tracking-tight">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div className="flex items-center tabular-nums">
          {timeLeft.days > 0 ? <span className="mr-1.5 text-[14px]">{timeLeft.days}일</span> : null}
          <span>{pad(timeLeft.hours)}</span>
          <span className="opacity-50 mx-[2px] relative -top-[1px]">:</span>
          <span>{pad(timeLeft.minutes)}</span>
          <span className="opacity-50 mx-[2px] relative -top-[1px]">:</span>
          <span className={isWarning ? 'animate-pulse' : ''}>{pad(timeLeft.seconds)}</span>
        </div>
      </div>
    );

    const timerContent = (
      <span className={`text-[15px] whitespace-nowrap transition-colors duration-300 ${isWarning ? 'text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-primary'}`}>
        {timeString}
      </span>
    );

    // containerClassName이 있으면 컨테이너 div로 감싸서 반환
    if (containerClassName) {
      return (
        <div className={containerClassName} style={containerStyle}>
          {timerContent}
        </div>
      );
    }

    return timerContent;
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
