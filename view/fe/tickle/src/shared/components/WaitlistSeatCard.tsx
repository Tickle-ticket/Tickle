import React from 'react';

// 사람 아이콘 SVG 컴포넌트
const PersonIcon = ({ highlighted, color }: { highlighted?: boolean; color?: string }) => (
  <svg width="16" height="24" viewBox="0 0 16 28" fill="currentColor" className={`transition-all ${highlighted ? `${color || 'text-blue-500'} scale-110` : 'text-gray-300'}`}>
    <circle cx="8" cy="4" r="3.5" />
    <path d="M13 12C13 9.2 10.8 7 8 7C5.2 7 3 9.2 3 12V18H5V27H11V18H13V12Z" />
  </svg>
);

export interface WaitlistSeatCardProps {
  seat: {
    id: string; // cancellationCandidateId
    waitlistNumber: number; // currentRank
    info: string;
    eventTitle: string;
    eventDate: string;
    status?: 'WAITING' | 'OFFERED' | string;
    cancellationOfferId?: number | null;
  };
  onSelectOffer: (id: string) => void;
  onCancel: (seat: any) => void;
}

export const WaitlistSeatCard = ({ seat, onSelectOffer, onCancel }: WaitlistSeatCardProps) => {
  // 백워드 호환을 위해 status가 없으면 waitlistNumber로 판단
  const isOffered = seat.status === 'OFFERED' || (!seat.status && seat.waitlistNumber <= 0);
  const rank = seat.waitlistNumber;

  // 테마 색상
  let themeColor = '';
  let themeBg = '';
  let themeBorder = '';
  let personColor = '';
  let badgeBg = '';

  if (isOffered) {
    themeColor = 'text-rose-500';
    themeBg = 'bg-gradient-to-br from-rose-50 to-pink-50';
    themeBorder = 'border-rose-200';
    personColor = 'text-rose-500';
    badgeBg = 'bg-rose-100';
  } else if (rank <= 3) {
    themeColor = 'text-blue-600';
    themeBg = 'bg-gradient-to-br from-blue-50 to-indigo-50';
    themeBorder = 'border-blue-200';
    personColor = 'text-blue-500';
    badgeBg = 'bg-blue-100';
  } else if (rank <= 10) {
    themeColor = 'text-violet-600';
    themeBg = 'bg-gradient-to-br from-violet-50 to-purple-50';
    themeBorder = 'border-violet-200';
    personColor = 'text-violet-500';
    badgeBg = 'bg-violet-100';
  } else {
    themeColor = 'text-gray-500';
    themeBg = 'bg-gradient-to-br from-gray-50 to-slate-50';
    themeBorder = 'border-gray-200';
    personColor = 'text-gray-500';
    badgeBg = 'bg-gray-100';
  }

  // 대기열 시각화: 최대 표시할 사람 수
  const maxVisible = Math.min(rank + 2, 12);
  const myPosition = rank; // 1-based

  return (
    <div className={`rounded-2xl border ${themeBorder} ${themeBg} p-4 transition-all hover:shadow-lg hover:-translate-y-0.5`}>
      {/* 상단: 뱃지 + 액션 버튼 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="shrink-0">
          {isOffered ? (
            <span className={`text-[11px] font-extrabold ${themeColor} ${badgeBg} px-2 py-0.5 rounded-full`}>배정 완료</span>
          ) : (
            <span className={`text-[11px] font-extrabold ${themeColor} ${badgeBg} px-2 py-0.5 rounded-full`}>
              대기 {rank}번째
            </span>
          )}
        </div>

        <div className="shrink-0">
          {isOffered ? (
            <button
              onClick={() => {
                if (seat.cancellationOfferId) {
                  onSelectOffer(String(seat.cancellationOfferId));
                }
              }}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all whitespace-nowrap"
            >
              결제하기
            </button>
          ) : (
            <button
              onClick={() => onCancel(seat)}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-400 hover:text-red-400 rounded-xl text-[11px] font-medium border border-gray-200 hover:border-red-200 transition-all whitespace-nowrap"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* 하단: 좌석 정보(좌) + 대기열 시각화(우) */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 pb-0.5">
          <p className="text-sm font-bold text-gray-800 truncate">{seat.info}</p>
          <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
            {seat.eventTitle} · {new Date(seat.eventDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </p>
        </div>

        {isOffered ? (
          <div className="shrink-0 flex items-end">
            <div className="flex flex-col items-center justify-end h-[46px] relative">
              <div className="animate-bounce">
                <PersonIcon highlighted={true} color="text-rose-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex items-end">
            {rank > 6 && (
              <span className="text-gray-300 font-black tracking-widest mr-2 mb-1 text-[14px]">...</span>
            )}
            {Array.from({ length: Math.min(rank - 1, 5) + 1 + 5 }).map((_, i) => {
              const frontCount = Math.min(rank - 1, 5);
              const isMe = i === frontCount;
              return (
                <div key={i} className="flex flex-col items-center justify-end h-[46px] relative" style={{ marginLeft: i > 0 ? '-2px' : '0' }}>
                  {isMe && (
                    <div className="flex flex-col items-center animate-bounce mb-0.5">
                      <span className="text-[10px] font-black text-blue-500 leading-none">{rank}</span>
                    </div>
                  )}
                  <PersonIcon highlighted={isMe} color={isMe ? 'text-blue-500' : 'text-gray-300'} />
                </div>
              );
            })}
            <span className="text-gray-300 font-black tracking-widest ml-2 mb-1 text-[14px]">...</span>
          </div>
        )}
      </div>
    </div>
  );
};
