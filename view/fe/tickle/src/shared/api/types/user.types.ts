import { Schema } from 'effect';

export interface UpdateMyInfoRequest {
  phoneNumber?: string;
  nickname?: string;
  profileImage?: File | null;
}

export const MyInfoResponseDataSchema = Schema.Struct({
  userId: Schema.Number,
  userNo: Schema.String,
  email: Schema.String,
  phoneNumber: Schema.Union(Schema.String, Schema.Null),
  name: Schema.String,
  nickname: Schema.String,
  profileImageUrl: Schema.Union(Schema.String, Schema.Null),
  birthDate: Schema.Union(Schema.String, Schema.Null),
});

export type MyInfoResponseData = Schema.Schema.Type<typeof MyInfoResponseDataSchema>;
