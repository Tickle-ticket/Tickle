import { getAccessToken } from './tokenManager';

export type AppRole = 'USER' | 'ORGANIZER' | 'ADMIN';

type AccessTokenClaims = {
  sub?: string;
  role?: string;
  roles?: string[] | string;
  authorities?: string[] | string;
  auth?: string[] | string;
};

const normalizeBase64Url = (value: string) => {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  return normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    '=',
  );
};

const normalizeRole = (value: string): AppRole | null => {
  const normalizedValue = value.trim().replace(/^ROLE_/i, '').toUpperCase();

  if (
    normalizedValue === 'USER' ||
    normalizedValue === 'ORGANIZER' ||
    normalizedValue === 'ADMIN'
  ) {
    return normalizedValue;
  }

  return null;
};

const collectRoleValues = (value: string[] | string | undefined) => {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : value.split(/[,\s]+/);

  return rawValues
    .map((roleValue) => normalizeRole(roleValue))
    .filter((roleValue): roleValue is AppRole => roleValue !== null);
};

export const getAccessTokenClaims = (token = getAccessToken()): AccessTokenClaims | null => {
  const payload = token?.split('.')[1];

  if (!payload || typeof window === 'undefined') {
    return null;
  }

  try {
    const decodedPayload = window.atob(normalizeBase64Url(payload));
    return JSON.parse(decodedPayload) as AccessTokenClaims;
  } catch {
    return null;
  }
};

export const getAccessTokenRoles = (token = getAccessToken()): AppRole[] => {
  const claims = getAccessTokenClaims(token);

  if (!claims) {
    return [];
  }

  return Array.from(
    new Set([
      ...collectRoleValues(claims.role),
      ...collectRoleValues(claims.roles),
      ...collectRoleValues(claims.authorities),
      ...collectRoleValues(claims.auth),
    ]),
  );
};

export const hasRequiredRole = (requiredRoles: AppRole[], token = getAccessToken()) => {
  const roles = getAccessTokenRoles(token);
  return requiredRoles.some((requiredRole) => roles.includes(requiredRole));
};
