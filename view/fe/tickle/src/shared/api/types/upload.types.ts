import { Schema } from 'effect';
import type { ApiResponse } from '../types';

export const UploadResponsePayloadSchema = Schema.Union(
  Schema.String,
  Schema.Struct({
    imageUrl: Schema.optionalWith(Schema.String, { exact: true }),
    url: Schema.optionalWith(Schema.String, { exact: true }),
    fileUrl: Schema.optionalWith(Schema.String, { exact: true }),
  })
);

export type UploadResponsePayload = Schema.Schema.Type<typeof UploadResponsePayloadSchema>;

export type UploadImageResponse = ApiResponse<UploadResponsePayload> | UploadResponsePayload;
