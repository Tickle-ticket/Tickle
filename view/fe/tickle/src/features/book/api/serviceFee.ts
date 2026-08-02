/**
 * 예매 수수료 계산을 다룹니다.
 *
 * <p>서버(PaymentConstants.TICKET_SERVICE_FEE_RATE)와 같은 규칙을 클라이언트에서
 * 다시 계산합니다. 원래는 서버 값을 그대로 쓰는 게 맞지만, 권종을 고르기 전
 * 단계(BookingOptionsResponse)에는 수수료가 내려오지 않습니다. 좌석마다 어떤
 * 권종을 고를지에 따라 금액이 달라져 서버도 아직 확정할 수 없기 때문입니다.
 * 그래서 이 단계에서만 예상 금액을 보여주고, 실제 청구는 서버가 확정합니다.</p>
 *
 * <p>규칙을 두 곳에 두는 것이라 서버가 요율을 바꾸면 여기도 바꿔야 합니다.
 * 예상 금액을 쓰는 곳을 이 파일 하나로 모아 두어 바꿀 곳을 한 군데로 만듭니다.</p>
 */

/**
 * 예매 수수료율.
 *
 * 서버 {@code PaymentConstants.TICKET_SERVICE_FEE_RATE}와 같아야 한다.
 */
export const SERVICE_FEE_RATE = 0.05;

/**
 * 티켓 가격에 붙는 예매 수수료를 구합니다.
 *
 * <p>서버가 {@code RoundingMode.DOWN}으로 원 단위를 버리므로 여기서도 버립니다.
 * 반올림하면 서버가 청구하는 금액과 1원씩 어긋납니다.</p>
 *
 * @param ticketPriceAmount 티켓 가격(수수료 제외)
 * @return 수수료. 원 단위 미만은 버린다
 */
export const calculateServiceFee = (ticketPriceAmount: number): number =>
  Math.floor(ticketPriceAmount * SERVICE_FEE_RATE);

/**
 * 좌석별 티켓 가격에서 수수료 합계를 구합니다.
 *
 * <p>서버가 좌석마다 따로 계산해 합치므로 같은 순서로 계산해야 합니다. 합계에
 * 한 번에 요율을 곱하면 버림이 한 번만 일어나 서버와 몇 원씩 어긋납니다.</p>
 *
 * @param ticketPriceAmounts 좌석별 티켓 가격
 * @return 수수료 합계
 */
export const sumServiceFees = (ticketPriceAmounts: readonly number[]): number =>
  ticketPriceAmounts.reduce((sum, price) => sum + calculateServiceFee(price), 0);

/**
 * 수수료가 포함된 총액에서 티켓 가격을 되짚습니다.
 *
 * <p>취소표는 서버가 총액만 내려주고 티켓 가격과 수수료를 따로 알려주지 않아
 * 표시용으로 되짚어야 합니다.</p>
 *
 * <p>{@code Math.round}가 아니라 올림입니다. 서버가 수수료를 버림하므로 총액은
 * 항상 {@code 티켓가 × 1.05} 이하이고, 나눈 값도 실제 티켓가 이하가 됩니다.
 * 올림해야 원래 값으로 돌아옵니다. 1,000~300,000원 전 구간에서 반올림은 45%가
 * 1원씩 어긋나고 올림은 어긋나지 않습니다.</p>
 *
 * <p>좌석이 여럿이면 서버가 좌석마다 버린 금액이 총액에 섞여 있어 이 방법으로도
 * 정확히 되짚을 수 없습니다. 취소표는 한 좌석짜리라 성립합니다.</p>
 *
 * @param totalAmount 수수료가 포함된 총액
 * @return 티켓 가격(수수료 제외)
 */
export const inferTicketPrice = (totalAmount: number): number =>
  Math.ceil(totalAmount / (1 + SERVICE_FEE_RATE));
