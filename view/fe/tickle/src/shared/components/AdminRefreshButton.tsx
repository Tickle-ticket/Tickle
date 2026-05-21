import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface AdminRefreshButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  isLoading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
}

export function AdminRefreshButton({
  isLoading = false,
  loadingLabel = '갱신 중',
  children = '새로고침',
  className = '',
  disabled,
  ...props
}: AdminRefreshButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-black text-content-secondary shadow-sm transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-content-muted disabled:shadow-none ${className}`}
      disabled={isDisabled}
      type="button"
    >
      <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}

export default AdminRefreshButton;
