import type {
  BookingOptionsResponse,
  BookingSeatOptionResponse,
  PriceInfoResponse,
} from '@/src/shared/api/types/booking.types';

/**
 * 좌석의 권종(할인) 목록과 금액 계산을 다룹니다.
 *
 * <p>같은 폴백 계산이 예매 화면 5곳에 복사돼 있었습니다. 금액이라 한 곳만 고치면
 * 화면마다 다른 값이 나오고, 실제로 한 곳은 다른 곳과 다르게 동작하고 있었습니다
 * (아래 {@link calculateGradeTotal} 참고).</p>
 */

/** 권종 정보가 없을 때 만들어 쓰는 기본 권종의 이름. */
const DEFAULT_DISCOUNT_NAME = '일반';

/**
 * 좌석의 권종 목록을 돌려줍니다.
 *
 * <p>서버가 권종을 내려주지 않는 경우(예매 초안 단계 등)가 있어, 그때는 총액을
 * 좌석 수로 나눈 값을 단일 권종으로 만들어 씁니다. 나눗셈이라 1원 단위 오차가
 * 생길 수 있지만 실제 청구는 서버가 확정하므로 표시용으로만 씁니다.</p>
 *
 * @param seat        기준 좌석 (같은 등급끼리 권종을 공유한다고 본다)
 * @param optionsData 예매 옵션 응답. 폴백 금액을 구하는 데 쓴다
 * @return 권종 목록. 비어 있지 않다
 */
export const resolvePriceInfos = (
  seat: BookingSeatOptionResponse | undefined,
  optionsData: BookingOptionsResponse | undefined,
): readonly PriceInfoResponse[] => {
  const priceInfos = seat?.priceInfos ?? [];
  if (priceInfos.length > 0) {
    return priceInfos;
  }

  if (!optionsData) {
    return [];
  }

  const fallbackPrice = Math.floor(
    optionsData.totalTicketPriceAmount / Math.max(1, optionsData.seats.length),
  );
  return [
    { discountName: DEFAULT_DISCOUNT_NAME, discountRate: 0, ticketPriceAmount: fallbackPrice },
  ];
};

/**
 * 할인이 적용되지 않은 기준 금액을 찾습니다.
 *
 * @param priceInfos 권종 목록
 * @return 할인율 0인 권종의 금액. 없으면 첫 권종의 금액, 그것도 없으면 0
 */
export const findBasePrice = (priceInfos: readonly PriceInfoResponse[]): number =>
  priceInfos.find((info) => info.discountRate === 0)?.ticketPriceAmount ??
  priceInfos[0]?.ticketPriceAmount ??
  0;

/**
 * 한 등급에서 선택된 매수의 합계를 구합니다.
 *
 * <p>선택된 권종 이름이 목록에 없을 때 기준 금액으로 대신합니다. 이전에는 결제
 * 요약 화면만 그 경우를 합계에서 빼고 있어, 같은 상황에서 권종 선택 화면과
 * 다른 금액을 보여줬습니다. 총액이 더 적게 보이는 쪽이라 사용자가 결제 직전에
 * 금액이 바뀌는 것을 겪게 됩니다.</p>
 *
 * @param priceInfos 권종 목록
 * @param counts     권종 이름별 선택 매수
 * @return 합계 금액
 */
export const calculateGradeTotal = (
  priceInfos: readonly PriceInfoResponse[],
  counts: Record<string, number>,
): number =>
  listGradeTicketPrices(priceInfos, counts).reduce((sum, price) => sum + price, 0);

/**
 * 한 등급에서 선택된 티켓들의 가격을 장당 하나씩 나열합니다.
 *
 * <p>수수료는 서버가 좌석마다 따로 계산해 버림하므로, 합계만으로는 같은 값을 낼 수
 * 없습니다. 장당 가격이 필요해서 {@link calculateGradeTotal}에서 이 부분을
 * 떼어냈습니다.</p>
 *
 * @param priceInfos 권종 목록
 * @param counts     권종 이름별 선택 매수
 * @return 티켓 한 장당 가격 목록
 */
export const listGradeTicketPrices = (
  priceInfos: readonly PriceInfoResponse[],
  counts: Record<string, number>,
): number[] => {
  const basePrice = findBasePrice(priceInfos);

  return Object.entries(counts).flatMap(([discountName, count]) => {
    const matched = priceInfos.find((info) => info.discountName === discountName);
    const price = matched?.ticketPriceAmount ?? basePrice;
    return Array.from({ length: Math.max(0, count) }, () => price);
  });
};
