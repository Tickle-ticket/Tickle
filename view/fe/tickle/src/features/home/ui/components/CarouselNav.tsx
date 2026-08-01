'use client';

/**
 * 가로 캐러셀의 이전·다음 버튼입니다.
 *
 * <p>랭킹·오픈 예정 두 섹션이 같은 모양을 씁니다. 좁은 화면에서는 숨기고
 * 스와이프로 넘깁니다.</p>
 *
 * @param canLeft 왼쪽으로 더 스크롤할 수 있는지
 * @param canRight 오른쪽으로 더 스크롤할 수 있는지
 * @param onPrev  이전 버튼 클릭
 * @param onNext  다음 버튼 클릭
 */
export const CarouselNav = ({
  canLeft,
  canRight,
  onPrev,
  onNext,
}: {
  canLeft: boolean;
  canRight: boolean;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="hidden md:flex items-center gap-1.5 ml-auto">
    <button
      onClick={onPrev}
      disabled={!canLeft}
      className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150 ${
        canLeft
          ? "border-line-strong text-content-secondary hover:bg-surface-muted hover:border-line-strong active:scale-90"
          : "border-line text-gray-250 cursor-default"
      }`}
      aria-label="이전"
    >
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 19.5L8.25 12l7.5-7.5"
        />
      </svg>
    </button>
    <button
      onClick={onNext}
      disabled={!canRight}
      className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150 ${
        canRight
          ? "border-line-strong text-content-secondary hover:bg-surface-muted hover:border-line-strong active:scale-90"
          : "border-line text-gray-250 cursor-default"
      }`}
      aria-label="다음"
    >
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </button>
  </div>
);
