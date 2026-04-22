import React from 'react';
import type { InfoTitleProps } from './types';

export const InfoTitle = ({ title, className = '', isLoading = false }: InfoTitleProps) => {
  if (isLoading) return null;
  return (
    <h3 className={`text-xl md:text-[22px] font-bold tracking-tight leading-snug line-clamp-2 break-keep ${className}`}>
      {title}
    </h3>
  );
};
