import React from 'react';
import type { BannerPlaceProps } from './types';

export const BannerPlace = ({
  place,
  color,
  className = '',
  isLoading = false,
}: BannerPlaceProps) => {
  if (isLoading) return null;

  return (
    <div 
      className={`text-base md:text-lg font-bold whitespace-pre-line line-clamp-2 break-keep opacity-95 mt-1 ${!color ? 'text-white' : ''} ${className}`}
      style={color ? { color } : undefined}
    >
      {place}
    </div>
  );
};
