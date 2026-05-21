import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueueView } from './QueueView';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockedUserProfile = {
  userId: 1,
  avatarUrl: 'https://picsum.photos/200',
  name: '홍길동',
  nickname: '길동이',
  realName: '홍길동',
  email: 'test@tickle.com',
  phoneNumber: '010-1234-5678',
};

queryClient.setQueryData(['userProfile'], mockedUserProfile);

const meta: Meta<typeof QueueView> = {
  title: 'user/QueueView',
  component: QueueView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QueueView>;

export const Default: Story = {
  args: {
    eventId: '1',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    fastMode: false,
    storyMode: true,
  },
};

export const FastMode: Story = {
  args: {
    eventId: '1',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    fastMode: true,
  },
};

export const ErrorStatus: Story = {
  args: {
    eventId: 'invalid-id',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    fastMode: false,
  },
};

export const CancellationWait: Story = {
  args: {
    eventId: '1',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    fastMode: false,
    storyMode: true,
    scope: 'CANCELLATION_WAIT',
  },
};

export const Mobile: Story = {
  args: {
    eventId: '1',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    storyMode: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};

export const Tablet: Story = {
  args: {
    eventId: '1',
    onAdmitted: (token) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    storyMode: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};
