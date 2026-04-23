import React from 'react';
import type { ToggleProps } from './types';

export const Toggle = ({
  checked,
  onChange,
  disabled = false,
  isLoading = false,
  size = 'medium',
  className = '',
}: ToggleProps) => {

  const sizeClasses = {
    small: { track: 'w-10 h-6', knob: 'w-5 h-5', translate: 'translate-x-[16px]' },
    medium: { track: 'w-[52px] h-[30px]', knob: 'w-[26px] h-[26px]', translate: 'translate-x-[22px]' },
  };

  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 rounded-full animate-pulse ${sizeClasses[size].track} ${className}`}
        aria-hidden="true"
      />
    );
  }

  const { track, knob, translate } = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative flex items-center shrink-0 rounded-full cursor-pointer
        transition-colors duration-200 ease-in-out outline-none
        focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
        ${track}
        ${checked ? 'bg-[#3182f6]' : 'bg-[#e5e8eb]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
        ${className}
      `}
    >
      <div
        className={`
          absolute left-[2px] bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.2)]
          transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
          ${knob}
          ${checked ? translate : 'translate-x-0'}
        `}
      />
    </button>
  );
};
