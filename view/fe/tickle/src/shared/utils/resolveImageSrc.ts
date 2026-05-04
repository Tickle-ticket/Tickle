const LEGACY_UPLOAD_PATH_PREFIX = '/api/uploads';

export const resolveImageSrc = (src?: string | null) => {
  if (!src) return '';

  const trimmedSrc = src.trim();

  if (!trimmedSrc) return '';
  if (trimmedSrc.startsWith(LEGACY_UPLOAD_PATH_PREFIX)) return '';

  return trimmedSrc;
};
