import type {
  AgencyRegistrationFlowRequest,
  AgencyVenueTemplate,
} from '@/src/shared/api/types/agency.types';
import type { AgencySeatPolicy } from '@/src/shared/components/AgencySeatPolicyModal';
import { STAGE_4001_SEAT_IDS } from '@/src/shared/components/Stage_4001';
import type {
  IntroImageItem,
  RegistrationValidationResult,
  SeatDiscountDraft,
  SeatGradeKey,
  TicketSchedulePreview,
} from './registrationTypes';
import {
  buildSeatTemplateState,
  createDisabledSeatPolicy,
  discountPresetNameMap,
  seatGradeFields,
  seatPolicyGradeToApiGrade,
  seatPriceGradeToApiGrade,
} from './registrationHelpers';

/** 등록 요청을 만드는 데 필요한 입력값입니다. */
export type RegistrationRequestInput = {
  performanceTitle: string;
  selectedCategoryId: string;
  performanceOpenAt: Date | null;
  performanceCloseAt: Date | null;
  resolvedSelectedVenue: number | null;
  posterImage: IntroImageItem | null;
  introImages: IntroImageItem[];
  performanceHashtags: string[];
  noticeText: string;
  registeredTicketSchedulePreviews: TicketSchedulePreview[];
  areTicketScheduleRulesComplete: boolean;
  hasInvalidTicketWindow: boolean;
  seatTemplate: AgencyVenueTemplate | null;
  seatPolicy: AgencySeatPolicy;
  seatPolicyVenueId: number | null;
  loadSeatTemplate: (venueId: number) => Promise<AgencyVenueTemplate>;
  seatPrices: Record<SeatGradeKey, string>;
  seatDiscounts: SeatDiscountDraft[];
};

/** 만들기에 성공하면 request를, 실패하면 첫 번째 오류를 돌려준다. */
export type RegistrationRequestResult =
  | { error: RegistrationValidationResult; request?: undefined }
  | { error?: undefined; request: AgencyRegistrationFlowRequest };

/**
 * 입력값을 검사하고 등록 요청 본문을 만듭니다.
 *
 * <p>검사와 조립이 한 흐름입니다. 좌석 등급이 지정된 좌석만 모으고, 그 등급에
 * 해당하는 금액만 필수로 보는 식이라 순서를 지켜야 합니다. 그래서 나누지 않고
 * 한 함수로 두되, 화면 상태를 건드리지 않도록 오류를 던지는 대신 돌려줍니다.</p>
 *
 * @param input 현재 입력값
 * @return 오류 또는 등록 요청 본문
 */
export const buildRegistrationRequest = async (
  input: RegistrationRequestInput,
): Promise<RegistrationRequestResult> => {
  const {
    performanceTitle,
    selectedCategoryId,
    performanceOpenAt,
    performanceCloseAt,
    resolvedSelectedVenue,
    posterImage,
    introImages,
    performanceHashtags,
    noticeText,
    registeredTicketSchedulePreviews,
    areTicketScheduleRulesComplete,
    hasInvalidTicketWindow,
    seatTemplate,
    seatPolicy,
    seatPolicyVenueId,
    loadSeatTemplate,
    seatPrices,
    seatDiscounts,
  } = input;

  const normalizedPerformanceTitle = performanceTitle.trim();
  const resolvedSelectedCategoryId = Number(selectedCategoryId);

  if (!normalizedPerformanceTitle) {
    return { error: {
      message: '공연명을 입력해 주세요.',
      target: 'performanceTitle',
      stepIndex: 0,
    } };
  }

  if (!performanceOpenAt || !performanceCloseAt) {
    return { error: {
      message: '공연 오픈일과 공연 종료일을 입력해 주세요.',
      target: 'performanceDate',
      stepIndex: 0,
    } };
  }

  if (registeredTicketSchedulePreviews.length === 0) {
    return { error: {
      message: '등록할 회차를 먼저 추가해 주세요.',
      target: 'schedule',
      stepIndex: 1,
    } };
  }

  if (!areTicketScheduleRulesComplete) {
    return { error: {
      message: '티켓 오픈 기준과 종료 기준을 입력해 주세요.',
      target: 'ticketRule',
      stepIndex: 1,
    } };
  }

  if (hasInvalidTicketWindow) {
    return { error: {
      message: '티켓 오픈일과 종료일 기준을 먼저 조정해 주세요.',
      target: 'ticketRule',
      stepIndex: 1,
    } };
  }

  if (!Number.isInteger(resolvedSelectedCategoryId) || resolvedSelectedCategoryId <= 0) {
    return { error: {
      message: '카테고리를 선택해 주세요.',
      target: 'category',
      stepIndex: 0,
    } };
  }

  if (resolvedSelectedVenue === null) {
    return { error: {
      message: '공연장을 선택해 주세요.',
      target: 'venue',
      stepIndex: 0,
    } };
  }

  if (!posterImage) {
    return { error: {
      message: '포스터 이미지를 등록해 주세요.',
      target: 'poster',
      stepIndex: 0,
    } };
  }

  const venueTemplate =
    seatTemplate?.venueId === resolvedSelectedVenue
      ? seatTemplate
      : await loadSeatTemplate(resolvedSelectedVenue);
  const templateSeatState = buildSeatTemplateState(venueTemplate);
  const { seatIdByLabel } = templateSeatState;
  const effectiveSeatPolicy =
    seatPolicyVenueId === resolvedSelectedVenue
      ? seatPolicy
      : templateSeatState.seatPolicy ?? createDisabledSeatPolicy();
  const missingSeatLabels = STAGE_4001_SEAT_IDS.filter((seatLabel) => {
    const assignment = effectiveSeatPolicy[seatLabel];

    return Boolean(assignment && assignment !== 'disabled' && !seatIdByLabel.has(seatLabel));
  });

  if (missingSeatLabels.length > 0) {
    const previewLabels = missingSeatLabels.slice(0, 5).join(', ');
    const suffix = missingSeatLabels.length > 5 ? ' ...' : '';

    return { error: {
      message: `좌석 등급이 지정된 좌석 중 공연장 좌석 정보와 연결되지 않은 항목이 있습니다. ${previewLabels}${suffix}`,
      target: 'seatPolicy',
      stepIndex: 2,
    } };
  }

  const seatGroups = (['VIP', 'R', 'S', 'A'] as const)
    .map((priceGrade) => {
      const seatIds = STAGE_4001_SEAT_IDS.flatMap((seatLabel) => {
        const assignment = effectiveSeatPolicy[seatLabel];

        if (!assignment || assignment === 'disabled') {
          return [];
        }

        return seatPolicyGradeToApiGrade[assignment] === priceGrade
          ? [seatIdByLabel.get(seatLabel) ?? -1]
          : [];
      }).filter((seatId) => seatId > 0);

      return {
        priceGrade,
        seatIds,
      };
    })
    .filter((seatGroup) => seatGroup.seatIds.length > 0);

  if (seatGroups.length === 0) {
    return { error: {
      message: '좌석 등급이 지정된 좌석이 없습니다. 먼저 좌석 등급을 설정해 주세요.',
      target: 'seatPolicy',
      stepIndex: 2,
    } };
  }

  const usedPriceGrades = new Set(seatGroups.map((seatGroup) => seatGroup.priceGrade));
  const missingPriceField = seatGradeFields.find(
    ({ key }) =>
      usedPriceGrades.has(seatPriceGradeToApiGrade[key]) &&
      seatPrices[key].trim().length === 0,
  );

  if (missingPriceField) {
    return { error: {
      message: `${missingPriceField.label} 금액을 입력해 주세요.`,
      target: 'seatPrice',
      stepIndex: 2,
    } };
  }

  const priceInfos: Array<{ discountName: string; discountRate: number }> = [];
  const seenDiscountNames = new Set<string>();

  for (let index = 0; index < seatDiscounts.length; index += 1) {
    const discount = seatDiscounts[index];
    const discountName =
      discount.preset === 'custom'
        ? discount.customDiscountName.trim()
        : discountPresetNameMap[discount.preset];
    const discountRateText = discount.discountRate.trim();

    if (discountName.length === 0 && discountRateText.length === 0) {
      continue;
    }

    if (discountName.length === 0) {
      return { error: {
        message: `할인 ${index + 1}의 이름을 입력해 주세요.`,
        target: 'discount',
        stepIndex: 2,
      } };
    }

    if (discountRateText.length === 0) {
      return { error: {
        message: `할인 ${index + 1}의 할인율을 입력해 주세요.`,
        target: 'discount',
        stepIndex: 2,
      } };
    }

    const discountRate = Number(discountRateText);
    if (!Number.isFinite(discountRate) || discountRate < 1 || discountRate > 100) {
      return { error: {
        message: `할인 ${index + 1}의 할인율은 1부터 100 사이여야 합니다.`,
        target: 'discount',
        stepIndex: 2,
      } };
    }

    const normalizedDiscountName = discountName.toLowerCase();

    if (seenDiscountNames.has(normalizedDiscountName)) {
      return { error: {
        message: `할인 ${index + 1}의 이름이 중복되었습니다.`,
        target: 'discount',
        stepIndex: 2,
      } };
    }

    seenDiscountNames.add(normalizedDiscountName);
    priceInfos.push({
      discountName,
      discountRate,
    });
  }

  const pricePolicies = seatGradeFields
    .filter(({ key }) => usedPriceGrades.has(seatPriceGradeToApiGrade[key]))
    .map(({ key }, index) => ({
      priceGrade: seatPriceGradeToApiGrade[key],
      defaultPriceAmount: Number(seatPrices[key]),
      priceInfos: [...priceInfos],
      currencyCode: 'KRW',
      displayOrder: index,
    }));

  const request: AgencyRegistrationFlowRequest = {
    basicEvent: {
      venueId: resolvedSelectedVenue,
      categoryId: resolvedSelectedCategoryId,
      title: normalizedPerformanceTitle,
      eventStartAt: performanceOpenAt.toISOString(),
      eventEndAt: performanceCloseAt.toISOString(),
      tags: performanceHashtags,
      notice: noticeText.trim(),
    },
    posterImage: posterImage.file,
    detailImages: introImages.map((image) => image.file),
    pricePolicies: {
      pricePolicies,
    },
    sessions: {
      sessions: registeredTicketSchedulePreviews.map((preview) => ({
        startAt: preview.scheduleAt.toISOString(),
        endAt: preview.sessionEndAt.toISOString(),
        salesOpenAt: preview.ticketOpenAt.toISOString(),
        salesCloseAt: preview.ticketCloseAt.toISOString(),
      })),
    },
    seats: {
      seats: seatGroups,
    },
  };

  return { request };
};
