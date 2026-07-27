import { getAccessToken } from "./tokenManager";

export type AppRole = "USER" | "ORGANIZER" | "ADMIN";

// 서버 발급 형식(services/auth JwtProvider#issueAccessToken)
//   .subject(userId).claim("role", role.name())
// role은 AuthUser.Role enum(USER/ORGANIZER/ADMIN)의 단일 문자열이다.
type AccessTokenClaims = {
  sub?: string;
  role?: string;
};

const normalizeBase64Url = (value: string) => {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  return normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );
};

// 화이트리스트 — 위조 토큰이 임의 role을 주입해도 AppRole로 통과하지 못하게 막는다.
// (클라이언트는 서명을 검증하지 않으므로 값 자체는 신뢰할 수 없다. 최종 권한 검증은 서버 몫)
const toAppRole = (value: string | undefined): AppRole | null => {
  if (value === "USER" || value === "ORGANIZER" || value === "ADMIN") {
    return value;
  }

  return null;
};

export const getAccessTokenClaims = (
  token = getAccessToken(),
): AccessTokenClaims | null => {
  const payload = token?.split(".")[1];

  if (!payload || typeof window === "undefined") {
    return null;
  }

  try {
    const decodedPayload = window.atob(normalizeBase64Url(payload));
    return JSON.parse(decodedPayload) as AccessTokenClaims;
  } catch {
    return null;
  }
};

// 서버는 role을 하나만 발급하지만, 소비처(RoleGuard·HomeView)가 includes로 다루므로
// 배열 시그니처를 유지한다. 알 수 없는 role은 빈 배열 → 권한 없음(fail-safe).
export const getAccessTokenRoles = (token = getAccessToken()): AppRole[] => {
  const role = toAppRole(getAccessTokenClaims(token)?.role);

  return role ? [role] : [];
};

export const hasRequiredRole = (
  requiredRoles: AppRole[],
  token = getAccessToken(),
) => {
  const roles = getAccessTokenRoles(token);
  return requiredRoles.some((requiredRole) => roles.includes(requiredRole));
};
