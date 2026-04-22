import React from 'react';
import type { InfoRankProps } from './types';

export const InfoRank = ({ rank, className = '', isLoading = false }: InfoRankProps) => {
  if (isLoading) return null;
  return (
    <div className={`absolute top-1 left-2 text-white font-black text-[60px] md:text-[80px] leading-none z-20 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-tighter ${className}`}>
      {rank}
    </div>
  );
};
