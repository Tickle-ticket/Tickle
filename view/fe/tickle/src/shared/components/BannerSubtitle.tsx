import React from 'react';
import type { BannerSubtitleProps } from './types';

export const BannerSubtitle = ({
  subtitle,
  color,
  className = '',
  isLoading = false,
}: BannerSubtitleProps) => {
  if (isLoading) return null;

  return (
    <p 
      className={`text-sm md:text-base font-medium opacity-80 whitespace-pre-line line-clamp-2 break-keep mb-1 ${!color ? 'text-white' : ''} ${className}`}
      style={color ? { color } : undefined}
    >
      {subtitle}
    </p>
  );
};
