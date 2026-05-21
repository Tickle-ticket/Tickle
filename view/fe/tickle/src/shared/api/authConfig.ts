const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getAuthApiBaseUrl = (fallback = '') => {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_API_URL || fallback || process.env.NEXT_PUBLIC_API_URL || '';
  return trimTrailingSlash(baseUrl);
};

export const buildAuthApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = getAuthApiBaseUrl();

  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
};
