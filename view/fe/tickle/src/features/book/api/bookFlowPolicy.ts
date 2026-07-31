import { isShadowMode } from '@/src/shared/utils/shadowMode';

/**
 * 예매 플로우가 실제 서버를 타는지, 대체 시나리오로 도는지를 판단하는 정책입니다.
 *
 * shadow 모드(eventId 404·405)는 봇 탐지 학습 데이터를 모으기 위한 가상 공연이라
 * 좌석 선점·예매 API를 호출하지 않는다. 그 조건이 화면 곳곳에 흩어져 있으면 실제
 * 예매 흐름을 읽을 때마다 함께 따져야 하므로, "무엇이 다른가"를 이 파일에만 둔다.
 *
 * Storybook은 여기를 타지 않는다 — MSW 핸들러가 응답을 내주므로 실제 코드 경로를
 * 그대로 태운다.
 */

/** 대기 신청 시나리오로 도는 shadow 공연 식별자. */
const SHADOW_WAITLIST_EVENT_ID = '404';

export interface BookFlowPolicy {
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
 * 예매 모드와 공연으로부터 플로우 정책을 만듭니다.
 *
 * @param mode    화면이 요청한 모드
 * @param eventId 공연 식별자 (shadow 판별에 쓴다)
 */
export const createBookFlowPolicy = (
  mode: 'BOOK' | 'CANCEL' | 'WAITLIST',
  eventId: string | undefined,
): BookFlowPolicy => {
  const isShadow = isShadowMode(eventId);

  return {
    isShadow,
    skipsServerCalls: isShadow,
    // shadow 중에서도 404만 대기 신청 시나리오를 재현한다(405는 일반 예매).
    isWaitlistMode: mode === 'WAITLIST' || (isShadow && eventId === SHADOW_WAITLIST_EVENT_ID),
    requiresLogin: !isShadow,
  };
};
