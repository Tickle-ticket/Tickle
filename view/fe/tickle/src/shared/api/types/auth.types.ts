import { Schema } from 'effect';

export const TokenResponseSchema = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  userId: Schema.Number,
});

export type TokenResponse = Schema.Schema.Type<typeof TokenResponseSchema>;

export interface SignUpRequest {
  email: string;
  password?: string;
  name: string;
  nickname?: string;
  birthDate?: string;
  phoneNumber?: string;
  role?: 'USER' | 'ORGANIZER';
  organizerId?: number;
  organizerName?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface ReissueRequest {
  refreshToken: string;
}
