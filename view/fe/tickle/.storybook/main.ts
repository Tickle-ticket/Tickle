import type { StorybookConfig } from '@storybook/nextjs-vite';

/**
 * Storybook 설정입니다.
 *
 * 프레임워크는 @storybook/nextjs-vite를 쓴다 — next/image·next/navigation 등
 * Next 전용 모듈을 Storybook에서도 동작시키기 위해서다.
 *
 * ※ @storybook/addon-viewport는 9.x가 설치돼 있으나 Storybook 10에서는 뷰포트가
 *   코어에 통합되어 별도 애드온이 필요 없다. 버전이 어긋나 로드에 실패하므로
 *   등록하지 않는다.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@chromatic-com/storybook',
    'msw-storybook-addon',
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  // MSW 워커 스크립트(public/mockServiceWorker.js)를 Storybook에서도 서빙한다.
  staticDirs: ['../public'],

  typescript: {
    // 스토리에서 컴포넌트 props 문서를 자동 생성한다.
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
