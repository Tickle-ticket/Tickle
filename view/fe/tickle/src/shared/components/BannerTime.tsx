import React from 'react';
import type { BannerTimeProps } from './types';

export const BannerTime = ({
  time,
  color,
  className = '',
  isLoading = false,
}: BannerTimeProps) => {
  if (isLoading) return null;

  return (
    <div 
      className={`text-sm md:text-base font-medium opacity-75 whitespace-pre-line line-clamp-2 break-keep ${!color ? 'text-white' : ''} ${className}`}
      style={color ? { color } : undefined}
    >
      {time}
    </div>
  );
};
