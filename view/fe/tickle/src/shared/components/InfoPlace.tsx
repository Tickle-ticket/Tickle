import React from 'react';
import type { InfoPlaceProps } from './types';

export const InfoPlace = ({ place, className = '', isLoading = false }: InfoPlaceProps) => {
  if (isLoading) return null;
  return (
    <p className={`text-[15px] md:text-base font-medium line-clamp-1 ${className}`}>
      {place}
    </p>
  );
};
