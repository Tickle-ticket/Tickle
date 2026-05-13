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
    fill: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
    outline: 'border border-blue-200 text-blue-600 bg-white shadow-sm hover:bg-blue-50',
    glass: 'bg-blue-500/20 text-blue-100 border border-blue-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  red: {
    fill: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
    outline: 'border border-red-200 text-red-600 bg-white shadow-sm hover:bg-red-50',
    glass: 'bg-red-500/20 text-red-100 border border-red-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  grey: {
    fill: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
    outline: 'border border-gray-200 text-gray-600 bg-white shadow-sm hover:bg-gray-50',
    glass: 'bg-gray-500/30 text-gray-100 border border-gray-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  green: {
    fill: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
    outline: 'border border-green-200 text-green-600 bg-white shadow-sm hover:bg-green-50',
    glass: 'bg-green-500/20 text-green-100 border border-green-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  },
  purple: {
    fill: 'bg-purple-100 text-purple-600',
    outline: 'border-[0.08em] border-purple-600 text-purple-600 bg-transparent',
    glass: 'bg-purple-500/20 text-purple-100 border border-purple-400/30 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
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
    const baseStyles = 'inline-block rounded-[0.3em] bg-gray-200 animate-pulse';
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
