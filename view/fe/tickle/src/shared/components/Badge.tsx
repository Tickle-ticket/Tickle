import type { BadgeSize, BadgeColor, BadgeVariant, BadgeProps } from './types';

const sizeStyles: Record<BadgeSize, string> = {
  xsmall: 'text-[10px] px-2 py-0.5 font-bold',
  small: 'text-xs px-2.5 py-0.5 font-semibold tracking-wide',
  medium: 'text-sm px-3 py-1 font-medium tracking-wide',
  large: 'text-base px-3.5 py-1 font-medium tracking-wide',
};

const skeletonSizeStyles: Record<BadgeSize, string> = {
  xsmall: 'h-4 w-10',
  small: 'h-5 w-12',
  medium: 'h-6 w-16',
  large: 'h-8 w-20',
};

const colorStyles: Record<BadgeColor, Record<BadgeVariant, string>> = {
  blue: {
    fill: 'bg-primary-subtle text-primary-hover ring-1 ring-inset ring-primary/10',
    outline: 'border border-primary-light text-primary bg-surface shadow-sm hover:bg-primary-subtle',
    glass: 'bg-primary/20 text-primary-light border border-primary/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  red: {
    fill: 'bg-danger-subtle text-danger-hover ring-1 ring-inset ring-danger/10',
    outline: 'border border-danger-light text-danger bg-surface shadow-sm hover:bg-danger-subtle',
    glass: 'bg-danger/20 text-danger-light border border-danger/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  grey: {
    fill: 'bg-surface-subtle text-content-secondary ring-1 ring-inset ring-line-strong/10',
    outline: 'border border-line text-content-secondary bg-surface shadow-sm hover:bg-surface-subtle',
    glass: 'bg-surface-active/30 text-content-inverse-muted border border-line-strong/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  green: {
    fill: 'bg-success-subtle text-success-hover ring-1 ring-inset ring-success/20',
    outline: 'border border-success-light text-success bg-surface shadow-sm hover:bg-success-subtle',
    glass: 'bg-success/20 text-success-light border border-success/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  purple: {
    fill: 'bg-accent-light text-accent',
    outline: 'border-[0.08em] border-accent text-accent bg-transparent',
    glass: 'bg-accent/20 text-accent-light border border-accent/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
};

export const Badge = ({
  size = 'medium',
  color = 'blue',
  variant = 'fill',
  children,
  className = '',
  fullWidth = false,
  maxLength = 5,
  isLoading = false,
}: BadgeProps) => {
  if (isLoading) {
    const baseStyles = 'inline-block rounded-[0.3em] bg-surface-active animate-pulse';
    const selectedSize = skeletonSizeStyles[size];
    const combinedClassName = fullWidth
      ? `${baseStyles} ${selectedSize.split(' ')[0]} w-full ${className}`
      : `${baseStyles} ${selectedSize} ${className}`;

    return <span className={combinedClassName} />;
  }

  const baseStyles = 'inline-flex items-center justify-center rounded-md transition-all whitespace-nowrap';
  const widthStyle = fullWidth ? 'w-full' : 'w-fit';
  const selectedSize = sizeStyles[size];
  const selectedColor = colorStyles[color][variant];
  const displayChildren =
    typeof children === 'string' && children.length > maxLength
      ? `${children.substring(0, maxLength)}...`
      : children;

  return (
    <span className={`${baseStyles} ${selectedSize} ${selectedColor} ${widthStyle} ${className}`}>
      {displayChildren}
    </span>
  );
};
