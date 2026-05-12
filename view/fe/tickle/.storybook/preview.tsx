import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import '../src/app/globals.css'
import { QueryProvider } from '../src/shared/providers/QueryProvider'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    viewport: {
      viewports: {
        iphone14: {
          name: 'iPhone 14',
          styles: { width: '390px', height: '844px' },
        },
        ipad: {
          name: 'iPad',
          styles: { width: '768px', height: '1024px' },
        },
        iphoneSE: {
          name: 'iPhone SE',
          styles: { width: '375px', height: '667px' },
        },
        responsive: {
          name: 'Responsive (직접 조절)',
          styles: { width: '100%', height: '100%' },
          type: 'desktop',
        },
      },
      defaultViewport: 'responsive',
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <QueryProvider>
        <Story />
      </QueryProvider>
    ),
  ],
};

export default preview;
