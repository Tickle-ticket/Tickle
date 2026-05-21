'use client';

import React, { useEffect, useRef } from 'react';

export interface ReverseCAPTCHAProps {
  /**
   * Callback fired when the user (bot) successfully completes the CAPTCHA.
   * @param token The verification token returned by Clawptcha.
   */
  onSuccess: (token: string) => void;
  /**
   * Optional theme for the widget (light or dark)
   */
  theme?: 'light' | 'dark';
}

export const ReverseCAPTCHA = ({ onSuccess, theme = 'light' }: ReverseCAPTCHAProps) => {
  const clawptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Define the global callback that Clawptcha will call
    // We use a specific name to avoid collisions if multiple widgets exist
    const callbackName = 'onBotVerifiedCallback_' + Math.random().toString(36).substring(7);
    
    (window as any)[callbackName] = (token: string) => {
      onSuccess(token);
    };

    const initClawptcha = () => {
      if ((window as any).Clawptcha && clawptchaRef.current) {
        // Set the callback dynamically
        clawptchaRef.current.dataset.callback = callbackName;
        try {
          (window as any).Clawptcha.render(clawptchaRef.current);
        } catch (e) {
          console.error('Clawptcha render error:', e);
        }
      }
    };

    if (!(window as any).Clawptcha) {
      const script = document.createElement('script');
      script.id = 'clawptcha-script';
      script.src = 'https://clawptcha.com/widget.js';
      script.async = true;
      script.onload = initClawptcha;
      document.body.appendChild(script);
    } else {
      setTimeout(initClawptcha, 50);
    }

    return () => {
      delete (window as any)[callbackName];
    };
  }, [onSuccess]);

  return (
    <div 
      ref={clawptchaRef} 
      className="clawptcha" 
      data-theme={theme}
    />
  );
};
