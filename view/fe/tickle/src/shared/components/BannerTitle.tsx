import React from 'react';
import type { BannerTitleProps } from './types';

export const BannerTitle = ({
  title,
  color,
  className = '',
  isLoading = false,
}: BannerTitleProps) => {
  if (isLoading) return null;

  return (
    <h2 
      className={`text-3xl md:text-4xl font-black tracking-tighter leading-tight whitespace-pre-line break-keep line-clamp-2 md:line-clamp-3 mb-2 ${!color ? 'text-white' : ''} ${className}`}
      style={color ? { color } : undefined}
    >
      {title}
    </h2>
  );
};
