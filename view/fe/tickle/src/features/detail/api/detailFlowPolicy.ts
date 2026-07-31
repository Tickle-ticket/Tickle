import { isShadowMode } from '@/src/shared/utils/shadowMode';
import { isMockLoginEvent } from '@/src/shared/config/mockEventConfig';

/**
 * 공연 상세 화면이 실제 서버를 타는지, 대체 시나리오로 도는지를 판단하는 정책입니다.
 *
 * DetailView에는 `!storyMode && !isShadowMode(...)` 조건이 흩어져 있었는데,
 * 두 값이 뜻하는 바는 하나다 — **찜·예매 API를 호출하지 않는 시나리오**.
 * 조건을 그대로 두면 실제 흐름을 읽을 때마다 두 플래그를 함께 따져야 하므로,
 * "무엇이 다른가"를 이 파일에만 둔다.
 *
 *  - **storyMode**: Storybook 전용. 서버 없이 화면만 그린다.
 *  - **shadowMode**: 봇 탐지 학습 데이터 수집용 가상 공연(eventId 404·405).
 *  - **체험 로그인 공연**: 행사용 공연은 자체 헤더를 쓰므로 전역 헤더를 숨긴다.
 */

export interface DetailFlowPolicy {
  /** 찜·예매 API를 건너뛰는 시나리오인지 여부. */
  readonly skipsServerCalls: boolean;
  /** 로그인 여부를 확인해야 하는지. 대체 시나리오는 비회원으로도 진행한다. */
  readonly requiresLogin: boolean;
  /** 전역 헤더를 표시할지 여부. 체험 로그인 공연은 자체 UI를 쓴다. */
  readonly showsGlobalHeader: boolean;
}

/**
 * 공연 식별자와 Storybook 여부로부터 상세 화면 정책을 만듭니다.
 *
 * @param eventId   공연 식별자 (shadow·체험 공연 판별에 쓴다)
 * @param storyMode Storybook에서 렌더 중인지 여부
 */
export const createDetailFlowPolicy = (
  eventId: string | null | undefined,
  storyMode: boolean,
): DetailFlowPolicy => {
  const skipsServerCalls = storyMode || isShadowMode(eventId);

  return {
    skipsServerCalls,
    requiresLogin: !skipsServerCalls,
    showsGlobalHeader: !isMockLoginEvent(eventId),
  };
};
