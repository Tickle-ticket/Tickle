'use client';

import { AdminSidebar } from './AdminSidebar';
import type { AdminSidebarItem, AdminSidebarProps } from './AdminSidebar';

export const agencySidebarItems: AdminSidebarItem[] = [
  { label: '공연 등록', href: '/agency' },
  { label: '등록한 공연 목록', href: '/agency/performances' },
];

export interface AgencySidebarProps extends Pick<AdminSidebarProps, 'className' | 'badgeLabel'> {
  items?: AdminSidebarItem[];
  brandLabel?: string;
  title?: string;
}

export function AgencySidebar({
  items = agencySidebarItems,
  brandLabel = '티클 기획사',
  badgeLabel = 'AGENCY',
  title = '기획사',
  className,
}: AgencySidebarProps) {
  return (
    <AdminSidebar
      items={items}
      brandLabel={brandLabel}
      badgeLabel={badgeLabel}
      title={title}
      className={className}
    />
  );
}

export default AgencySidebar;
