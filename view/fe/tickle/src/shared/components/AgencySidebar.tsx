'use client';

import { AdminSidebar } from './AdminSidebar';
import type { AdminSidebarItem, AdminSidebarProps } from './AdminSidebar';

export const agencySidebarItems: AdminSidebarItem[] = [
  { label: '공연 등록', href: '/agency' },
  { label: '등록한 공연 목록', href: '/agency/performances' },
  { label: '공연 정산 조회', href: '/agency/settlements' },
];

export interface AgencySidebarProps extends Pick<AdminSidebarProps, 'className'> {
  items?: AdminSidebarItem[];
  brandLabel?: string;
  title?: string;
}

export function AgencySidebar({
  items = agencySidebarItems,
  brandLabel = '티클 기획사',
  title = '기획사',
  className,
}: AgencySidebarProps) {
  return (
    <AdminSidebar
      items={items}
      brandLabel={brandLabel}
      title={title}
      className={className}
    />
  );
}

export default AgencySidebar;
