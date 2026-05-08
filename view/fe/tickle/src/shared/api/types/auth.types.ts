import { Schema } from 'effect';

export const TokenResponseSchema = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  userId: Schema.Number,
});

export type TokenResponse = Schema.Schema.Type<typeof TokenResponseSchema>;

export const KakaoExistingUserResponseSchema = Schema.Struct({
  isNewUser: Schema.Literal(false),
  signUpToken: Schema.Null,
  accessToken: Schema.String,
  refreshToken: Schema.String,
  userId: Schema.Number,
});

export const KakaoNewUserResponseSchema = Schema.Struct({
  isNewUser: Schema.Literal(true),
  signUpToken: Schema.String,
  accessToken: Schema.Null,
  refreshToken: Schema.Null,
  userId: Schema.Null,
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

export interface ReissueRequest {
  refreshToken: string;
}
