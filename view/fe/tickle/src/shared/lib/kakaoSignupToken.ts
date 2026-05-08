const KAKAO_SIGNUP_TOKEN_STORAGE_KEY = 'kakaoSignUpToken';

export const getKakaoSignUpToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(KAKAO_SIGNUP_TOKEN_STORAGE_KEY);
};

export const setKakaoSignUpToken = (token: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(KAKAO_SIGNUP_TOKEN_STORAGE_KEY, token);
};

export const clearKakaoSignUpToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(KAKAO_SIGNUP_TOKEN_STORAGE_KEY);
};
