import { Schema } from 'effect';

export const TokenResponseSchema = Schema.Struct({
  accessToken: Schema.String,
});

export type TokenResponse = Schema.Schema.Type<typeof TokenResponseSchema>;

/**
 * 로그인 후 이동할 경로.
 *
 * 인증 서버가 아니라 BFF 라우트(api/v1/auth/kakao/login)가 채워준다. 로그인 시작
 * 때 쿠키에 담아둔 값을 돌려주는 것으로, state를 경로로 재사용하던 방식을 대체한다.
 */
const RedirectPathSchema = Schema.optional(Schema.String);

export const KakaoExistingUserResponseSchema = Schema.Struct({
  isNewUser: Schema.Literal(false),
  signUpToken: Schema.Null,
  accessToken: Schema.String,
  redirectPath: RedirectPathSchema,
});

export const KakaoNewUserResponseSchema = Schema.Struct({
  isNewUser: Schema.Literal(true),
  signUpToken: Schema.String,
  accessToken: Schema.Null,
  redirectPath: RedirectPathSchema,
});

export const KakaoLoginResponseSchema = Schema.Union(
  KakaoExistingUserResponseSchema,
  KakaoNewUserResponseSchema
);

export type KakaoLoginResponse = Schema.Schema.Type<typeof KakaoLoginResponseSchema>;

export interface SignUpRequest {
  email: string;
  password?: string;
  name: string;
  nickname?: string;
  birthDate?: string;
  phoneNumber?: string;
  role?: 'USER' | 'ORGANIZER';
  organizerName?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface MockLoginRequest {
  name: string;
  phoneNumber: string;
}

export interface KakaoLoginRequest {
  code: string;
  state: string;
}

export interface KakaoSignUpRequest {
  signUpToken: string;
  phoneNumber: string;
  name: string;
  birthDate: string;
}

export interface PhoneCodeVerifyRequest {
  phoneNumber: string;
  code: string;
}

