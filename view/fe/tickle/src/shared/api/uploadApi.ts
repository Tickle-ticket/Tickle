import type { ApiResponse } from './types';

type UploadImageResponse = ApiResponse<{
  imageUrl: string;
}>;

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const responseBody = (await response.json().catch(() => null)) as UploadImageResponse | null;

  if (!response.ok || !responseBody?.data?.imageUrl) {
    throw new Error(responseBody?.message || '이미지 업로드에 실패했습니다.');
  }

  return responseBody.data.imageUrl;
};

export const uploadImages = async (files: File[]) => Promise.all(files.map((file) => uploadImage(file)));
