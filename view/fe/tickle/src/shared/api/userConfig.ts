const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getUserApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_USER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_AUTH_API_URL ||
    '';

  return trimTrailingSlash(baseUrl);
};

export const buildUserApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = getUserApiBaseUrl();

  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
};
