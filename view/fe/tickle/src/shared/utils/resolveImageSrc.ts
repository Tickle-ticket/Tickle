export const resolveImageSrc = (src?: string | null) => {
  if (!src) return '';

  const trimmedSrc = src.trim();

  if (!trimmedSrc) return '';

  return trimmedSrc;
};
