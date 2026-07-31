const KAKAO_AUTH_BASE_URL = 'https://kauth.kakao.com/oauth/authorize';
const DEFAULT_KAKAO_SCOPE = 'account_email,profile_nickname,profile_image';
const KAKAO_CALLBACK_PATH = '/oauth/callback';

export const KAKAO_OAUTH_STATE_COOKIE_NAME = 'kakaoOAuthState';

/**
 * 로그인 후 돌아갈 경로를 담는 쿠키.
 *
 * state와 분리해서 보관한다. 예전에는 redirect 경로를 state로 재사용했는데,
 * 그러면 state가 '/'처럼 예측 가능한 값이 되어 CSRF 방어(콜백에서 쿠키와
 * 대조하는 검증)가 무력해진다. state는 난수, 이동 경로는 이 쿠키가 맡는다.
 */
export const KAKAO_OAUTH_REDIRECT_COOKIE_NAME = 'kakaoOAuthRedirect';

/**
 * 로그인 후 이동할 경로를 안전한 값으로 좁힙니다.
 *
 * `//evil.com`이나 `/\evil.com`은 브라우저가 외부 오리진으로 해석하므로
 * 같은 사이트 내 경로만 허용해 open redirect를 막는다.
 *
 * @param value 요청에서 받은 redirect 파라미터
 * @returns 허용된 경로, 아니면 '/'
 */
export const sanitizeKakaoRedirectPath = (value: string | null | undefined) => {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  // '//host' · '/\host' 형태는 프로토콜 상대 URL로 외부 이동이 된다.
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }

  return value;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const firstHeaderValue = (value: string | null) => value?.split(',')[0]?.trim() || null;

const getConfiguredKakaoRedirectUris = () =>
  [process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI?.trim()].filter((value): value is string => Boolean(value));

const getKakaoClientId = () => {
  const clientId =
    process.env.KAKAO_REST_API_KEY?.trim() || process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY?.trim();

  if (!clientId) {
    throw new Error('KAKAO_REST_API_KEY or NEXT_PUBLIC_KAKAO_REST_API_KEY is missing.');
  }

  return clientId;
};

const getKakaoScope = () => process.env.KAKAO_SCOPE?.trim() || process.env.NEXT_PUBLIC_KAKAO_SCOPE?.trim() || DEFAULT_KAKAO_SCOPE;

export const generateKakaoOAuthState = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const resolveKakaoRedirectUri = (origin: string) => {
  const normalizedOrigin = trimTrailingSlash(origin);
  const configuredRedirectUris = getConfiguredKakaoRedirectUris();

  const sameOriginRedirectUri = configuredRedirectUris.find((value) => {
    try {
      return trimTrailingSlash(new URL(value).origin) === normalizedOrigin;
    } catch {
      return false;
    }
  });

  if (sameOriginRedirectUri) {
    return sameOriginRedirectUri;
  }

  if (configuredRedirectUris.length > 0) {
    const httpsRedirectUri = configuredRedirectUris.find((value) => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    });

    if (process.env.NODE_ENV === 'production') {
      return httpsRedirectUri ?? configuredRedirectUris[0];
    }

    return configuredRedirectUris[0];
  }

  return `${normalizedOrigin}${KAKAO_CALLBACK_PATH}`;
};

export const resolveKakaoRequestOrigin = (requestUrl: string, headers: Headers) => {
  const requestOrigin = new URL(requestUrl).origin;
  const forwardedHost = firstHeaderValue(headers.get('x-forwarded-host'));
  const host = forwardedHost || firstHeaderValue(headers.get('host'));

  if (!host) {
    return requestOrigin;
  }

  const forwardedProto = firstHeaderValue(headers.get('x-forwarded-proto'));
  const protocol = forwardedProto || new URL(requestUrl).protocol.replace(':', '');

  return `${protocol}://${host}`;
};

export const buildKakaoAuthorizeUrl = ({
  state,
  redirectUri,
}: {
  state: string;
  redirectUri: string;
}) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getKakaoClientId(),
    redirect_uri: redirectUri,
    scope: getKakaoScope(),
    state,
  });

  return `${KAKAO_AUTH_BASE_URL}?${params.toString()}`;
};
