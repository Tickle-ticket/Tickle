import React from 'react';
import type { InfoDayProps } from './types';

export const InfoDay = ({ day, className = '', isLoading = false }: InfoDayProps) => {
  if (isLoading) return null;
  return (
    <p className={`text-sm md:text-[15px] font-normal line-clamp-1 ${className}`}>
      {day}
    </p>
  );
};
