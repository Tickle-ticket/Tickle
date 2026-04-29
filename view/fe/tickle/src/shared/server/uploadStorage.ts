import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { buildLocalUploadImageUrl } from '@/src/shared/utils/imageUrl';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const mimeToExtension: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

export class UploadStorageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UploadStorageError';
    this.status = status;
  }
}

const getUploadDirectory = () => process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), '.uploads');

const getContentTypeByFilename = (filename: string) =>
  Object.entries(mimeToExtension).find(([, extension]) => filename.endsWith(extension))?.[0] ??
  'application/octet-stream';

const validateImageFile = (file: File) => {
  if (!file.type || !(file.type in mimeToExtension)) {
    throw new UploadStorageError('지원하지 않는 이미지 형식입니다.');
  }

  if (file.size <= 0) {
    throw new UploadStorageError('비어 있는 파일은 업로드할 수 없습니다.');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadStorageError('이미지 파일은 10MB 이하여야 합니다.');
  }
};

export const buildImageUrl = (filename: string) => buildLocalUploadImageUrl(filename);

export const saveImageFile = async (file: File) => {
  validateImageFile(file);

  const extension = mimeToExtension[file.type];
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const uploadDirectory = getUploadDirectory();
  const absolutePath = path.join(uploadDirectory, filename);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(absolutePath, fileBuffer);

  return filename;
};

export const readImageFile = async (filename: string) => {
  const sanitizedFilename = path.basename(filename);

  if (!sanitizedFilename || sanitizedFilename !== filename) {
    throw new UploadStorageError('잘못된 파일 경로입니다.', 400);
  }

  const absolutePath = path.join(getUploadDirectory(), sanitizedFilename);

  try {
    const fileBuffer = await readFile(absolutePath);

    return {
      fileBuffer,
      contentType: getContentTypeByFilename(sanitizedFilename),
    };
  } catch {
    throw new UploadStorageError('업로드된 파일을 찾을 수 없습니다.', 404);
  }
};
