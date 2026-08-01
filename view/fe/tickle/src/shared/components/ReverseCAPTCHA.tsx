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
    // 템플릿 리터럴로 만들어야 window의 인덱스 시그니처와 타입이 맞물린다.
    // 문자열 덧셈으로 만들면 그냥 string이 되어 어떤 키인지 알 수 없다.
    const callbackName = `onBotVerifiedCallback_${Math.random().toString(36).substring(7)}` as const;
    
    window[callbackName] = (token: string) => {
      onSuccess(token);
    };

    const initClawptcha = () => {
      if (window.Clawptcha && clawptchaRef.current) {
        // Set the callback dynamically
        clawptchaRef.current.dataset.callback = callbackName;
        try {
          window.Clawptcha.render(clawptchaRef.current);
        } catch (e) {
          console.error('Clawptcha render error:', e);
        }
      }
    };

    if (!window.Clawptcha) {
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
      delete window[callbackName];
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
