'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getAccessToken } from '@/src/shared/api/tokenManager';
import { hasRequiredRole, type AppRole } from '@/src/shared/api/tokenClaims';

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
  const accessToken = getAccessToken();
  const isAllowed = accessToken ? hasRequiredRole(allowedRoles, accessToken) : false;

  useEffect(() => {
    if (!accessToken) {
      const redirectPath = buildRedirectPath(pathname, searchParams);
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (!hasRequiredRole(allowedRoles, accessToken)) {
      router.replace('/');
    }
  }, [accessToken, allowedRoles, allowedRolesKey, pathname, router, searchParams]);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}

export default RoleGuard;
