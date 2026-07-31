import React from 'react';
import { useCancellationDetail } from '@/src/features/cancellation/api/useCancellationDetail';

const OfferTimer = ({ cancellationId }: { cancellationId: number }) => {
  // 만료된 오퍼(404)는 타이머만 표시하지 않으면 되므로 화면을 대체하지 않는다.
  // useCancellationDetail의 기본값이 그렇게 동작한다.
  const { data } = useCancellationDetail(cancellationId);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!data?.offerExpiresAt) return;
    const updateTimer = () => {
      const remaining = new Date(data.offerExpiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(remaining / 1000)));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data?.offerExpiresAt]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center relative z-10">
      <span className="text-[10px] text-highlight font-bold mb-0.5 tracking-wide">결제 만료까지</span>
      <span className="text-highlight text-2xl font-black tabular-nums tracking-tighter drop-shadow-sm leading-none bg-highlight-subtle/80 px-2 py-0.5 rounded-xl">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// 사람 아이콘 SVG 컴포넌트
const PersonIcon = ({ highlighted, color }: { highlighted?: boolean; color?: string }) => (
  <svg width="16" height="24" viewBox="0 0 16 28" fill="currentColor" className={`transition-all ${highlighted ? `${color || 'text-primary'} scale-110` : 'text-content-muted'}`}>
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
  onPassOffer?: (cancellationId: string) => void;
}

export const WaitlistSeatCard = ({ seat, onSelectOffer, onCancel, onPassOffer }: WaitlistSeatCardProps) => {
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
    themeColor = 'text-highlight';
    themeBg = 'bg-gradient-to-br from-rose-50 to-pink-50';
    themeBorder = 'border-danger-light';
    personColor = 'text-highlight';
    badgeBg = 'bg-highlight-light';
  } else if (rank <= 3) {
    themeColor = 'text-primary';
    themeBg = 'bg-gradient-to-br from-blue-50 to-indigo-50';
    themeBorder = 'border-primary-light';
    personColor = 'text-primary';
    badgeBg = 'bg-primary-light';
  } else if (rank <= 10) {
    themeColor = 'text-accent';
    themeBg = 'bg-gradient-to-br from-violet-50 to-purple-50';
    themeBorder = 'border-accent-light';
    personColor = 'text-accent';
    badgeBg = 'bg-accent-light';
  } else {
    themeColor = 'text-content-tertiary';
    themeBg = 'bg-gradient-to-br from-gray-50 to-slate-50';
    themeBorder = 'border-line';
    personColor = 'text-content-tertiary';
    badgeBg = 'bg-surface-muted';
  }

  // 대기열 시각화: 최대 표시할 사람 수
  const maxVisible = Math.min(rank + 2, 12);
  const myPosition = rank; // 1-based

  return (
    <div className={`relative rounded-2xl border ${themeBorder} ${themeBg} p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden`}>
      {/* 상단: 뱃지 + 액션 버튼 */}
      <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (seat.cancellationOfferId && onPassOffer) {
                    onPassOffer(String(seat.cancellationOfferId));
                  }
                }}
                className="px-3.5 py-2 bg-surface hover:bg-highlight-subtle text-highlight rounded-xl text-[11px] font-bold border border-danger-light shadow-sm transition-all whitespace-nowrap"
              >
                취소하기
              </button>
              <button
                onClick={() => {
                  if (seat.cancellationOfferId) {
                    onSelectOffer(String(seat.cancellationOfferId));
                  }
                }}
                className="px-3.5 py-2 bg-highlight hover:bg-highlight active:bg-danger-hover text-white rounded-xl text-[11px] font-bold shadow-sm transition-all whitespace-nowrap"
              >
                결제하기
              </button>
            </div>
          ) : (
            <button
              onClick={() => onCancel(seat)}
              className="px-2.5 py-1.5 bg-surface hover:bg-surface-subtle text-content-muted hover:text-danger rounded-xl text-[11px] font-medium border border-line hover:border-danger-light transition-all whitespace-nowrap"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* 하단: 좌석 정보(좌) + 대기열 시각화(우) */}
      <div className="flex items-end justify-between gap-3 relative z-10 mt-2">
        <div className="min-w-0 flex-1 pb-0.5">
          <p className="text-sm font-bold text-content truncate">{seat.info}</p>
          <p className="text-[11px] text-content-muted font-medium truncate mt-0.5">
            {seat.eventTitle} · {new Date(seat.eventDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </p>
        </div>

        {isOffered ? (
          <div className="shrink-0 flex items-end justify-center h-[46px]">
            {seat.cancellationOfferId && <OfferTimer cancellationId={seat.cancellationOfferId} />}
          </div>
        ) : (
          <div className="shrink-0 flex items-end">
            {rank > 6 && (
              <span className="text-content-muted font-black tracking-widest mr-2 mb-1 text-[14px]">...</span>
            )}
            {Array.from({ length: Math.min(rank - 1, 5) + 1 + 5 }).map((_, i) => {
              const frontCount = Math.min(rank - 1, 5);
              const isMe = i === frontCount;
              return (
                <div key={i} className="flex flex-col items-center justify-end h-[46px] relative" style={{ marginLeft: i > 0 ? '-2px' : '0' }}>
                  {isMe && (
                    <div className="flex flex-col items-center animate-bounce mb-0.5">
                      <span className="text-[10px] font-black text-primary leading-none">{rank}</span>
                    </div>
                  )}
                  <PersonIcon highlighted={isMe} color={isMe ? 'text-primary' : 'text-content-muted'} />
                </div>
              );
            })}
            <span className="text-content-muted font-black tracking-widest ml-2 mb-1 text-[14px]">...</span>
          </div>
        )}
      </div>
    </div>
  );
};
