import { isShadowMode } from '@/src/shared/utils/shadowMode';

/**
 * 예매 플로우가 실제 서버를 타는지, 대체 시나리오로 도는지를 판단하는 정책입니다.
 *
 * BookView에는 `storyMode || isShadowModeActive` 조건이 여러 곳에 흩어져 있었는데,
 * 두 값이 뜻하는 바는 결국 하나다 — **좌석 선점·예매 API를 호출하지 않는 시나리오**.
 * 조건을 그대로 두면 실제 예매 흐름을 읽을 때마다 두 플래그를 함께 따져야 하므로,
 * "무엇이 다른가"를 이 파일에만 두고 화면은 정책이 내준 값만 쓴다.
 *
 *  - **storyMode**: Storybook 전용. 서버 없이 화면만 그린다.
 *  - **shadowMode**: 봇 탐지 학습 데이터 수집용 가상 공연(eventId 404·405).
 */

/** 대기 신청 시나리오로 도는 shadow 공연 식별자. */
const SHADOW_WAITLIST_EVENT_ID = '404';

export interface BookFlowPolicy {
  /** Storybook 전용 시나리오 여부. */
  readonly isStory: boolean;
  /** 봇 탐지용 가상 공연 여부. */
  readonly isShadow: boolean;
  /**
   * 좌석 선점·예매 API를 건너뛰는 시나리오인지 여부.
   *
   * 참이면 로그인 확인·좌석 선점·권종 조회를 모두 생략하고 대체 데이터로 진행한다.
   */
  readonly skipsServerCalls: boolean;
  /** 대기 신청 화면으로 동작하는지 여부. */
  readonly isWaitlistMode: boolean;
  /** 로그인 여부를 확인해야 하는지. 대체 시나리오는 비회원으로도 진행한다. */
  readonly requiresLogin: boolean;
}

/**
 * 예매 모드·공연·Storybook 여부로부터 플로우 정책을 만듭니다.
 *
 * @param mode      화면이 요청한 모드
 * @param eventId   공연 식별자 (shadow 판별에 쓴다)
 * @param storyMode Storybook에서 렌더 중인지 여부
 */
export const createBookFlowPolicy = (
  mode: 'BOOK' | 'CANCEL' | 'WAITLIST',
  eventId: string | undefined,
  storyMode: boolean,
): BookFlowPolicy => {
  const isShadow = isShadowMode(eventId);
  const skipsServerCalls = storyMode || isShadow;

  return {
    isStory: storyMode,
    isShadow,
    skipsServerCalls,
    // shadow 중에서도 404만 대기 신청 시나리오를 재현한다(405는 일반 예매).
    isWaitlistMode: mode === 'WAITLIST' || (isShadow && eventId === SHADOW_WAITLIST_EVENT_ID),
    requiresLogin: !skipsServerCalls,
  };
};
