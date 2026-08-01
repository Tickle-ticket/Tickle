/**
 * 외부 스크립트가 window에 주입하는 값들의 타입입니다.
 *
 * <p>봇 검증 위젯(Cloudflare Turnstile, Clawptcha)은 우리 번들 밖에서 로드되어
 * 전역 객체를 통해 통신합니다. 콜백은 우리가 심고 위젯이 호출하며, 위젯 객체는
 * 그 반대입니다.</p>
 *
 * <p>선언이 없으면 접근할 때마다 {@code (window as any)}를 써야 하고, 그러면
 * 위젯이 기대하는 이름을 한 글자만 틀려도 컴파일이 통과합니다. 검증 콜백이
 * 불리지 않으면 사용자가 CAPTCHA를 풀어도 다음 단계로 넘어가지 못합니다.</p>
 */

/** Clawptcha 위젯이 노출하는 API. */
interface ClawptchaWidget {
  /** 지정한 요소에 위젯을 그린다. */
  render: (element: HTMLElement) => void;
}

declare global {
  interface Window {
    /**
     * Clawptcha 스크립트가 로드되면 채워진다.
     *
     * 로드 전에는 undefined이므로 접근 전에 확인해야 한다.
     */
    Clawptcha?: ClawptchaWidget;

    /**
     * Turnstile이 검증 성공 시 호출하는 콜백.
     *
     * 위젯의 data-callback 속성에 이 이름을 적어두면 스크립트가 찾아 부른다.
     * 컴포넌트가 언마운트될 때 지운다.
     */
    onTurnstileSuccess?: (token: string) => void;

    /**
     * 차단 페이지로 이동하는 중인지.
     *
     * location.replace로 문서가 바뀌어도 유지돼야 해서 모듈 변수로 둘 수 없다
     * (shared/utils/blockedNavigation).
     */
    __isNavigatingToBlocked__?: boolean;

    /**
     * Clawptcha가 부를 검증 콜백.
     *
     * 위젯이 여러 개 있을 때 충돌하지 않도록 이름을 런타임에 만들어 붙이므로
     * (onBotVerifiedCallback_xxxx) 키를 미리 선언할 수 없다.
     */
    [botVerifiedCallback: `onBotVerifiedCallback_${string}`]: ((token: string) => void) | undefined;
  }
}

export {};
