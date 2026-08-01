/**
 * 결제 수단으로 이동하는 중인지 표시합니다.
 *
 * <p>카카오페이 리다이렉트나 결제 완료 페이지 이동은 사용자가 예매를 포기한 것이
 * 아닙니다. 이 표시가 없으면 이탈 감지 로직이 좌석 선점을 풀고 "정말 나가시겠냐"는
 * 경고를 띄웁니다.</p>
 *
 * <p>이전에는 {@code (window as any).__isNavigatingToPayment__}로 전역 객체에
 * 직접 심었습니다. `as any`라 이름을 한 글자만 틀려도 컴파일이 통과했고, 실제로
 * 그러면 결제 도중에 좌석이 풀렸습니다.</p>
 */

/**
 * 결제 이동 중 여부.
 *
 * 모듈 스코프에 두면 파일 간 공유는 그대로 되면서 오타는 컴파일에서 걸린다.
 */
let isNavigatingToPayment = false;

/**
 * 결제 이동을 시작했다고 표시합니다.
 *
 * <p>이후 이탈 감지가 좌석을 풀지 않습니다. 결제 흐름을 벗어나면 반드시
 * {@link clearNavigatingToPayment}로 되돌려야 합니다.</p>
 */
export const markNavigatingToPayment = (): void => {
  isNavigatingToPayment = true;
};

/**
 * 결제 이동 표시를 지웁니다.
 *
 * <p>카카오페이 팝업 결제는 페이지를 떠나지 않으므로 표시가 저절로 사라지지
 * 않습니다. 결제를 취소하거나 실패해 예매 화면으로 돌아왔다면 여기서 지워야,
 * 그다음 진짜 이탈에서 좌석이 정상적으로 해제됩니다.</p>
 */
export const clearNavigatingToPayment = (): void => {
  isNavigatingToPayment = false;
};

/**
 * 결제 이동 중인지 확인합니다.
 *
 * @return 결제 수단으로 이동하는 중이면 true
 */
export const isNavigatingToPaymentFlow = (): boolean => isNavigatingToPayment;
