import React from 'react';
import type { Preview } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { handlers } from '../src/shared/api/mock/handlers';
import '../src/app/globals.css';

/**
 * Storybook 전역 설정입니다.
 *
 * 앱의 QueryProvider를 그대로 쓰지 않고 스토리 전용 QueryClient를 만든다 —
 * 앱 쪽은 throwOnError로 에러를 Error Boundary에 올리는데, 스토리에서는
 * 에러 상태 자체를 화면으로 보여줘야 하기 때문이다.
 */

/** 스토리마다 캐시가 섞이지 않도록 렌더할 때마다 새로 만든다. */
const createStoryQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // 스토리를 열 때마다 최신 mock 응답을 받도록 캐시를 남기지 않는다.
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    // MSW를 Storybook에서도 켠다. 앱의 MSWProvider는 NEXT_PUBLIC_API_MOCKING을
    // 보지만 Storybook은 별도 프로세스라 그 값과 무관하게 항상 mock으로 돈다 —
    // UI 카탈로그가 백엔드 상태에 좌우되면 안 되기 때문이다.
    //
    // 앱과 같은 핸들러를 기본값으로 쓰고, 특정 상황(매진·에러 등)이 필요한
    // 스토리만 자기 parameters.msw로 덮어쓴다.
    msw: handlers,
  },

  loaders: [mswLoader()],

  decorators: [
    (Story) => (
      <QueryClientProvider client={createStoryQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default preview;
