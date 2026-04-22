import React, { useState, useEffect } from 'react';
import type { InfoTimeProps } from './types';

// 퍼포먼스 및 3D 플립 애니메이션 구동을 위한 키프레임 (글로벌 스타일 덮어쓰기 없이 독립 동작)
const flipStyles = `
  @keyframes flipTop {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(-90deg); }
  }
  @keyframes flipBottom {
    0% { transform: rotateX(90deg); }
    100% { transform: rotateX(0deg); }
  }
  .animate-flipTop {
    animation: flipTop 0.25s ease-in forwards;
    backface-visibility: hidden;
    transform-style: preserve-3d;
  }
  .animate-flipBottom {
    animation: flipBottom 0.25s ease-out 0.25s forwards;
    transform: rotateX(90deg);
    backface-visibility: hidden;
    transform-style: preserve-3d;
  }
`;

const FlipDigit = ({ digit, isSmall = false }: { digit: string; isSmall?: boolean }) => {
  const [current, setCurrent] = useState(digit);
  const [previous, setPrevious] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    // 숫자가 바뀌었을 때 플립 애니메이션을 트리거
    if (digit !== current) {
      setPrevious(current);
      setCurrent(digit);
      setIsFlipping(true);
    }
  }, [digit, current]);

  useEffect(() => {
    if (isFlipping) {
      // 위/아래 플립(0.25s + 0.25s)이 끝난 후 상태 초기화
      const timer = setTimeout(() => setIsFlipping(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isFlipping]);

  // 글자 수에 따른 반응형 사이즈 조정 (길이가 길면 작게, 짧으면 원래 크기로)
  const digitSizeClass = isSmall ? 'w-[20px] h-[30px] md:w-[23px] md:h-[36px]' : 'w-[24px] h-9 md:w-[32px] md:h-12';
  const textSizeClass = isSmall ? 'text-[18px] md:text-[20px]' : 'text-[22px] md:text-[28px]';
  const sharedSpanClass = `absolute left-1/2 transform -translate-x-1/2 text-white/95 ${textSizeClass} font-black font-sans tracking-widest leading-none drop-shadow-md`;

  return (
    <div className={`relative bg-[#1a1a1a] ${digitSizeClass} rounded-[3px] border border-black/80`} style={{ perspective: '300px' }}>
      
      {/* 1. 상단 뒷장 (바뀔 새 숫자가 미리 깔려있음) */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden bg-[#1a1a1a] rounded-t-[3px]">
        <span className={`${sharedSpanClass} bottom-0 translate-y-1/2`}>
          {current}
        </span>
      </div>
      
      {/* 2. 하단 뒷장 (현재 보이는 옛날 숫자) */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden bg-[#1a1a1a] rounded-b-[3px]">
        <span className={`${sharedSpanClass} top-0 -translate-y-1/2`}>
          {isFlipping ? previous : current}
        </span>
      </div>

      {/* 3. 넘어가는 윗 플랩 (옛날 숫자가 앞으로 쓰러짐) */}
      {isFlipping && (
        <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden bg-[#1a1a1a] origin-bottom rounded-t-[3px] animate-flipTop z-10 brightness-95">
          <span className={`${sharedSpanClass} bottom-0 translate-y-1/2`}>
            {previous}
          </span>
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/60 mix-blend-overlay"></div>
        </div>
      )}

      {/* 4. 펴지는 아랫 플랩 (새 숫자가 위에서 떨어짐) */}
      {isFlipping && (
        <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden bg-[#1a1a1a] origin-top rounded-b-[3px] animate-flipBottom z-10 brightness-110">
          <span className={`${sharedSpanClass} top-0 -translate-y-1/2`}>
            {current}
          </span>
        </div>
      )}

      {/* 가운데 분할선 (플랩 사이의 고정된 틈새) */}
      <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-[#000] z-20 transform -translate-y-1/2 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div>
      
      {/* 윗 프레임 상시 음영 (고급스러운 입체감) */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black/60 to-transparent z-[5] pointer-events-none"></div>
    </div>
  );
};


export const InfoTime = ({ targetDate, className = '', isLoading = false }: InfoTimeProps) => {
  const [currentText, setCurrentText] = useState('00:00:00');

  useEffect(() => {
    if (!targetDate) return;

    // 전달받은 목표 시간을 Date 객체로 변환하고 밀리초 값을 계산
    const targetTime = new Date(targetDate).getTime();

    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      
      const totalSeconds = Math.floor(diff / 1000);
      
      if (totalSeconds <= 0) return '00:00:00';

      const d = Math.floor(totalSeconds / 86400);
      const h = Math.floor((totalSeconds % 86400) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      const pad = (num: number) => String(num).padStart(2, '0');
      
      // 일(Day)이 남아있으면 DD:HH:MM:SS, 아니면 HH:MM:SS
      if (d > 0) {
        return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
      }
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    // 마운트 시 즉각 반영하여 깜빡임 방지
    setCurrentText(calculateTimeLeft());

    // 1초마다 남은 시간 지속 갱신
    const timerId = setInterval(() => {
      setCurrentText(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timerId);
  }, [targetDate]);

  const textStr = String(currentText);
  // 전체 문자열의 길이가 8강("HH:MM:SS") 이상이면 폭이 카드(280px)를 넘을 위험이 있으므로 작은 사이즈로 전환
  const isLong = textStr.length > 8;

  const parts = textStr.split(':');
  const hasColon = textStr.includes(':');
  
  // 길이에 따라 적절한 라벨 제공
  const labels = parts.length === 4 ? ['DAYS', 'HRS', 'MIN', 'SEC'] : ['HRS', 'MIN', 'SEC'];

  if (isLoading) return null;

  return (
    <>
      <style>{flipStyles}</style>
      <div className={`inline-flex items-center bg-gray-900 pt-1.5 pb-4 px-1.5 md:pt-2 md:pb-[20px] md:px-2 rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.8)] border border-gray-700/50 ${className}`}>
        <div className="flex items-center">
          {hasColon ? (
            parts.map((part, index) => (
              <React.Fragment key={index}>
                {/* 하나의 포맷(일/시간/분/초) 덩어리 */}
                <div className="relative flex justify-center">
                  <div className={`flex ${isLong ? 'gap-[1px]' : 'gap-[1px] md:gap-[2px]'}`}>
                    {part.split('').map((char, i) => (
                      <FlipDigit key={`${index}-${i}`} digit={char} isSmall={isLong} />
                    ))}
                  </div>
                  {/* 자리 표시 라벨 (앱솔루트로 하단 배치하여 레이아웃 어긋남 방지) */}
                  <span className={`absolute -bottom-[14px] md:-bottom-[17px] text-white/50 font-bold tracking-widest uppercase ${isLong ? 'text-[8px]' : 'text-[9px] md:text-[10px]'}`}>
                    {labels[index]}
                  </span>
                </div>

                {/* 구분자 (마지막 요소가 아닐 때만) */}
                {index < parts.length - 1 && (
                  <span className={`text-white/80 font-bold flex items-center ${isLong ? 'text-sm mx-0.5' : 'text-lg md:text-xl mx-0.5 md:mx-1'} transform -translate-y-px`}>
                    :
                  </span>
                )}
              </React.Fragment>
            ))
          ) : (
            // 콜론이 없는 길게 나열된 숫자 모드일 때
            <div className={`flex ${isLong ? 'gap-[1px]' : 'gap-[1px] md:gap-[2px]'}`}>
              {textStr.split('').map((char, i) => (
                <FlipDigit key={i} digit={char} isSmall={isLong} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
