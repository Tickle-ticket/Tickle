const KAKAO_AUTH_BASE_URL = 'https://kauth.kakao.com/oauth/authorize';
const DEFAULT_KAKAO_SCOPE = 'account_email,profile_nickname,profile_image';
const KAKAO_CALLBACK_PATH = '/oauth/callback';

export const KAKAO_OAUTH_STATE_COOKIE_NAME = 'kakaoOAuthState';

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
