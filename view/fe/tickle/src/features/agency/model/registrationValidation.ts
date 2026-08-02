import type {
  IntroImageItem,
  RegistrationValidationResult,
  TicketSchedulePreview,
} from './registrationTypes';

/**
 * 단계 검증에 필요한 값 모음입니다.
 */
export type RegistrationStepValidationInput = {
  isCategoryListLoading: boolean;
  isVenueListLoading: boolean;
  performanceTitle: string;
  performanceOpenAt: Date | null;
  performanceCloseAt: Date | null;
  selectedCategoryId: string;
  resolvedSelectedVenue: number | null;
  posterImage: IntroImageItem | null;
  registeredTicketSchedulePreviews: TicketSchedulePreview[];
  areTicketScheduleRulesComplete: boolean;
  hasInvalidTicketWindow: boolean;
};

/**
 * 해당 단계를 넘어가도 되는지 검사하고, 안 되면 첫 번째 이유를 돌려줍니다.
 *
 * <p>화면 상태를 읽기만 하고 바꾸지 않아 순수 함수로 뺐습니다. 어떤 조건에서
 * 어떤 안내가 나가는지 한 곳에 모여 있어야 문구를 고칠 때 빠뜨리지 않습니다.</p>
 *
 * @param stepIndex 검사할 단계
 * @param input     검사에 필요한 현재 입력값
 * @return 통과하면 null, 아니면 오류 내용
 */
export const getRegistrationStepValidationResult = (
stepIndex: number,
input: RegistrationStepValidationInput,
): RegistrationValidationResult | null => {
const {
  isCategoryListLoading,
  isVenueListLoading,
  performanceTitle,
  performanceOpenAt,
  performanceCloseAt,
  selectedCategoryId,
  resolvedSelectedVenue,
  posterImage,
  registeredTicketSchedulePreviews,
  areTicketScheduleRulesComplete,
  hasInvalidTicketWindow,
} = input;

  if (stepIndex === 0) {
    if (isCategoryListLoading || isVenueListLoading) {
      return {
        message: '데이터를 아직 불러오는 중입니다. 잠시 후 다시 진행해 주세요.',
        target: isCategoryListLoading ? 'category' : 'venue',
        stepIndex,
      };
    }

    if (performanceTitle.trim().length === 0) {
      return {
        message: '공연명을 입력해 주세요.',
        target: 'performanceTitle',
        stepIndex,
      };
    }

    if (!performanceOpenAt || !performanceCloseAt) {
      return {
        message: '공연 오픈일과 공연 종료일을 입력해 주세요.',
        target: 'performanceDate',
        stepIndex,
      };
    }

    if (selectedCategoryId.length === 0) {
      return {
        message: '카테고리를 선택해 주세요.',
        target: 'category',
        stepIndex,
      };
    }

    if (resolvedSelectedVenue === null) {
      return {
        message: '공연장을 선택해 주세요.',
        target: 'venue',
        stepIndex,
      };
    }

    if (posterImage === null) {
      return {
        message: '포스터 이미지를 등록해 주세요.',
        target: 'poster',
        stepIndex,
      };
    }

    return null;
  }

  if (stepIndex === 1) {
    if (registeredTicketSchedulePreviews.length === 0) {
      return {
        message: '공연 일정 등록 전에 최소 1개 이상의 회차를 먼저 추가해 주세요.',
        target: 'schedule',
        stepIndex,
      };
    }

    if (!areTicketScheduleRulesComplete) {
      return {
        message: '티켓 오픈 기준과 종료 기준을 입력해 주세요.',
        target: 'ticketRule',
        stepIndex,
      };
    }

    if (hasInvalidTicketWindow) {
      return {
        message: '티켓 오픈일과 종료일 기준이 올바르지 않습니다. 먼저 일정 기준을 다시 조정해 주세요.',
        target: 'ticketRule',
        stepIndex,
      };
    }
  }

  return null;
};

