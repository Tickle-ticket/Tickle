/**
 * mock 전용 JWT 생성기입니다.
 *
 * 실제 인증을 흉내내려는 것이 아니라, **프론트가 토큰을 파싱할 수 있는 형태**를
 * 맞추기 위한 것이다. tokenClaims.getAccessTokenClaims()가 `header.payload.signature`
 * 구조를 가정하고 payload를 base64 디코드해 `sub`·`role`을 꺼내므로, 단순 문자열
 * 토큰을 쓰면 role이 항상 빈 배열이 되어 RoleGuard가 걸린 화면에 접근할 수 없다.
 *
 * 서명은 프론트에서 검증하지 않으므로(서버 몫) 고정 문자열로 둔다.
 *
 * 서버 발급 형식: services/auth JwtProvider#issueAccessToken
 *   .subject(userId).claim("role", role.name())
 */

export type MockRole = 'USER' | 'ORGANIZER' | 'ADMIN';

/** 로그인 mock이 사용하는 기본 사용자 식별자. userHandlers의 users/me 응답과 맞춘다. */
export const MOCK_USER_ID = 1;

/** base64url 인코딩. JWT는 표준 base64가 아닌 base64url을 쓴다. */
const toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * 파싱 가능한 mock JWT를 만듭니다.
 *
 * @param role   토큰에 실을 권한
 * @param userId subject에 실을 사용자 식별자
 * @param expiresInSeconds 만료까지 남은 시간(초). 기본 1시간.
 */
export const createMockJwt = (
  role: MockRole = 'USER',
  userId: number = MOCK_USER_ID,
  expiresInSeconds = 60 * 60,
) => {
  const issuedAt = Math.floor(Date.now() / 1000);

  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: String(userId),
      role,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
    }),
  );

  return `${header}.${payload}.mock-signature`;
};

/**
 * 이메일로 발급할 권한을 고릅니다.
 *
 * mock에서는 계정 저장소를 두지 않고 아무 이메일/비밀번호나 통과시키므로,
 * 관리자·기획사 화면을 확인할 수단으로 이메일 패턴만 약속해둔다.
 *   admin@... → ADMIN · agency@... 또는 organizer@... → ORGANIZER · 그 외 USER
 */
export const resolveMockRole = (email?: string): MockRole => {
  const normalized = email?.trim().toLowerCase() ?? '';

  if (normalized.startsWith('admin')) {
    return 'ADMIN';
  }

  if (normalized.startsWith('agency') || normalized.startsWith('organizer')) {
    return 'ORGANIZER';
  }

  return 'USER';
};

/**
 * 요청의 Authorization 헤더에서 mock 토큰의 클레임을 읽습니다.
 *
 * 핸들러가 로그인 여부·userId·role로 응답을 나눌 때 사용한다.
 * 백엔드의 JwtProvider#resolveToken과 같은 `Bearer ` 접두사 규칙을 따른다.
 */
export const readMockClaims = (
  request: Request,
): { userId: number; role: MockRole } | null => {
  const header = request.headers.get('Authorization');

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const payload = header.slice('Bearer '.length).split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const claims = JSON.parse(atob(padded)) as { sub?: string; role?: string };

    return {
      userId: Number(claims.sub ?? MOCK_USER_ID),
      role: (claims.role as MockRole) ?? 'USER',
    };
  } catch {
    return null;
  }
};
