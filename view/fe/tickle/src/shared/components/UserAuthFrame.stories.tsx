import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from './Box';
import { Button } from './Button';
import { UserAuthFrame } from './UserAuthFrame';

const meta = {
  title: 'user/AuthFrame',
  component: UserAuthFrame,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
    footer: { control: false },
    authTabs: { control: false },
  },
} satisfies Meta<typeof UserAuthFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

import { LoginPageClient } from '../../app/login/LoginPageClient';

import React, { useEffect, useState } from 'react';



import { SignupPageClient } from '../../app/signup/SignupPageClient';
import { SignupFormPageClient } from '../../app/signup/form/SignupFormPageClient';


const InteractiveStoryRouter = () => {
  const [route, setRoute] = useState('/login');

  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setRoute(customEvent.detail);
    };
    window.addEventListener('storybook-auth-nav', handleNav);
    return () => window.removeEventListener('storybook-auth-nav', handleNav);
  }, []);

  if (route.startsWith('/signup/form')) {
    const isAgency = route.includes('type=agency');
    return <SignupFormPageClient initialAccountType={isAgency ? 'agency' : 'audience'} key={route} />;
  }

  if (route.startsWith('/signup')) {
    return <SignupPageClient />;
  }

  // key 프롭스를 줘서 라우트가 바뀔 때(mode 쿼리 변경)마다 강제로 다시 마운트하여 새로운 URL 값을 읽게 함
  return <LoginPageClient key={route} />;
};

export const ActualLoginPage: Story = {
  name: 'Actual Login Page (통합 테스트용)',
  render: () => <InteractiveStoryRouter />,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
      },
    },
  },
};

export const ActualLoginPageMobile: Story = {
  name: 'Actual Login Page Mobile (통합 테스트용)',
  render: () => <InteractiveStoryRouter />,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
