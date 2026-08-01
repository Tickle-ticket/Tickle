'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getAccessToken } from '@/src/shared/api/tokenManager';
import { hasRequiredRole, type AppRole } from '@/src/shared/api/tokenClaims';
import { useAuth } from '@/src/shared/providers/AuthProvider';

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

const buildRedirectPath = (pathname: string, searchParams: URLSearchParams) => {
  const search = searchParams.toString();
  return search.length > 0 ? `${pathname}?${search}` : pathname;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allowedRolesKey = useMemo(() => allowedRoles.join(','), [allowedRoles]);
  // 부팅 복구가 끝나기 전에는 판단하지 않는다. 토큰이 메모리에만 있어 새로고침
  // 직후에는 권한 있는 사용자도 토큰이 비어 있는데, 그대로 내보내면 관리자가
  // /admin을 새로고침할 때마다 로그인 화면으로 쫓겨난다.
  const { isResolved: isAuthResolved } = useAuth();
  const accessToken = getAccessToken();
  const isAllowed =
    isAuthResolved && accessToken ? hasRequiredRole(allowedRoles, accessToken) : false;

  useEffect(() => {
    if (!isAuthResolved) return;

    if (!accessToken) {
      const redirectPath = buildRedirectPath(pathname, searchParams);
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (!hasRequiredRole(allowedRoles, accessToken)) {
      router.replace('/');
    }
  }, [
    isAuthResolved,
    accessToken,
    allowedRoles,
    allowedRolesKey,
    pathname,
    router,
    searchParams,
  ]);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}

export default RoleGuard;
