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

/**
 * 업로드 타임아웃.
 *
 * 파일 전송은 조회와 달리 크기·회선에 따라 수십 초가 걸린다. apiClient의 기본
 * 15초를 그대로 두면 느린 회선에서 정상 업로드가 끊긴다.
 */
const UPLOAD_TIMEOUT_MS = 120_000;

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
      timeoutMs: UPLOAD_TIMEOUT_MS,
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
