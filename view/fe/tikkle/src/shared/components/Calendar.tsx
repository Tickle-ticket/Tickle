import React, { useState, useMemo } from 'react';
import type { CalendarProps } from './types';

// 날짜를 YYYY-MM-DD 형식의 문자열로 변환하는 헬퍼 함수
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const Calendar = ({
  enabledDates = [],
  selectedDate = null,
  onSelect,
  isLoading = false,
  className = '',
}: CalendarProps) => {
  // 표시 중인 달(기준 연월)의 1일
  const [currentMonth, setCurrentMonth] = useState(() => {
    // 만약 최초 렌더링 시점에 이미 enabledDates가 있다면 최적화를 위해 여기서 바로 초기화 가능
    if (enabledDates && enabledDates.length > 0) {
      const timestamps = enabledDates.map(d => new Date(d).getTime()).filter(t => !isNaN(t));
      if (timestamps.length > 0) {
        const minTimestamp = Math.min(...timestamps);
        const earliestDate = new Date(minTimestamp);
        return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // 서버 통신 등 비동기로 늦게 enabledDates가 들어올 경우를 대비해, 값이 채워지는 순간 딱 한 번 화면을 이동시키는 효과
  const [hasAutoNavigated, setHasAutoNavigated] = useState(() => (enabledDates && enabledDates.length > 0));

  React.useEffect(() => {
    if (!hasAutoNavigated && enabledDates && enabledDates.length > 0) {
      const timestamps = enabledDates.map(d => new Date(d).getTime()).filter(t => !isNaN(t));
      if (timestamps.length > 0) {
        const minTimestamp = Math.min(...timestamps);
        const earliestDate = new Date(minTimestamp);
        setCurrentMonth(new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1));
        setHasAutoNavigated(true);
      }
    }
  }, [enabledDates, hasAutoNavigated]);

  const enabledDateSet = useMemo(() => {
    return new Set(enabledDates.map(formatDate));
  }, [enabledDates]);

  // 로딩 상태 (스켈레톤 UI)
  if (isLoading) {
    return (
      <div className={`w-full max-w-[340px] bg-white rounded-[16px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${className}`}>
        {/* 헤더 스켈레톤 */}
        <div className="flex justify-center items-center mb-6">
          <div className="w-24 h-6 bg-gray-200 rounded-md animate-pulse" />
        </div>
        {/* 요일 스켈레톤 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* 날짜 그리드 스켈레톤 */}
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="flex justify-center items-center h-10 w-full">
              <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
  const daysInMonth = lastDayOfMonth.getDate();

  const selectedFormatted = selectedDate ? formatDate(selectedDate) : null;

  // 빈 칸 배열 (1일 이전)
  const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i);
  // 날짜 배열
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className={`w-full max-w-[340px] bg-white rounded-[16px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${className}`}>
      {/* 헤더: < 연월 > */}
      <div className="flex justify-between items-center mb-6 px-1">
        <button 
          onClick={handlePrevMonth}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors"
          aria-label="이전 달"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-[17px] font-bold text-gray-800 tracking-tight">
          {year}년 {month + 1}월
        </div>
        <button 
          onClick={handleNextMonth}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors"
          aria-label="다음 달"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex justify-center text-xs font-semibold text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-1">
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="h-10 w-full" />
        ))}
        {days.map((day) => {
          const dateObj = new Date(year, month, day);
          const formatted = formatDate(dateObj);
          
          const isEnabled = enabledDateSet.has(formatted);
          const isSelected = selectedFormatted === formatted;
          const isToday = formatDate(new Date()) === formatted;

          return (
            <div key={day} className="flex justify-center items-center h-10 w-full">
              <button
                disabled={!isEnabled}
                onClick={() => {
                  if (isEnabled && onSelect) {
                    onSelect(dateObj);
                  }
                }}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-medium transition-all
                  ${!isEnabled ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${isEnabled && !isSelected ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' : ''}
                  ${isSelected ? 'bg-blue-500 text-white shadow-sm' : ''}
                  ${isToday && !isSelected && isEnabled ? 'border border-gray-200' : ''}
                `}
                aria-pressed={isSelected}
                aria-disabled={!isEnabled}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
