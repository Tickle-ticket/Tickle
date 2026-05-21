import { apiClient } from './client';
import type { ApiResponse } from './types';

import type { UploadImageResponse } from './types/upload.types';
import { UploadResponsePayloadSchema } from './types/upload.types';
import { createApiResponseSchema } from '../utils/schema';
import { Schema } from 'effect';

const UploadImageResponseSchema = Schema.Union(
  createApiResponseSchema(UploadResponsePayloadSchema),
  UploadResponsePayloadSchema
);

const DEFAULT_UPLOAD_API_PATH = '/api/v1/uploads';
const uploadApiPath = process.env.NEXT_PUBLIC_UPLOAD_API_PATH || DEFAULT_UPLOAD_API_PATH;

const resolveUploadedImageUrl = (response: UploadImageResponse): string | null => {
  const payload = typeof response === 'object' && response !== null && 'data' in response ? response.data : response;

  if (typeof payload === 'string') {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload.imageUrl ?? payload.url ?? payload.fileUrl ?? null;
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient<UploadImageResponse>(
    uploadApiPath,
    {
      method: 'POST',
      body: formData,
    },
    false,
    UploadImageResponseSchema
  );
  const imageUrl = resolveUploadedImageUrl(response);

  if (!imageUrl) {
    throw new Error('이미지 업로드 응답에 imageUrl이 없습니다.');
  }

  return imageUrl;
};

export const uploadImages = async (files: File[]) => Promise.all(files.map((file) => uploadImage(file)));
