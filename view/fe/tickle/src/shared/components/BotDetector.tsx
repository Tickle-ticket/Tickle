"use client";

import React, { useEffect, useState } from 'react';
import { ErrorView } from './ErrorView';

export const BotDetector = ({ children }: { children: React.ReactNode }) => {
  const [isBot, setIsBot] = useState(false);

  useEffect(() => {
    // 1. Check for navigator.webdriver
    if (navigator.webdriver) {
      setIsBot(true);
      return;
    }

    // 2. Check for common automation variables injected by WebDriver
    const documentElement = window.document.documentElement;
    if (documentElement.getAttribute('webdriver')) {
      setIsBot(true);
      return;
    }

    // Optional: Additional checks for puppeteer / phantomjs can be added here
    if (window.navigator.userAgent.toLowerCase().includes('headless')) {
      setIsBot(true);
      return;
    }
  }, []);

  if (isBot) {
    if (typeof window !== 'undefined') {
      window.location.href = '/blocked';
    }
    return null;
  }

  return <>{children}</>;
};
