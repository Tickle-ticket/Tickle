import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Tab from './Tab';
import type { TabProps } from './types';

type TabStoryArgs = TabProps & {
  tabNames?: string[];
};

const meta = {
  title: 'Shared/Tab',
  component: Tab,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['small', 'large'], description: 'Tab size' },
    fluid: { control: 'boolean', description: 'Enable horizontal scrolling' },
    itemGap: { control: 'number', description: 'Gap between tab items in px' },
    isLoading: { control: 'boolean', description: 'Show loading skeletons' },
    skeletonCount: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Number of loading skeleton items',
    },
    children: {
      description: 'Tab.Item children',
      control: false,
    },
    onChange: {
      description: 'Called when the selected tab changes',
      control: false,
      action: 'changed',
    },
    tabNames: {
      name: 'Story tab names',
      control: 'object',
      description: 'Story-only labels used to render tab items',
    },
  },
} satisfies Meta<TabStoryArgs>;

export default meta;
type Story = StoryObj<TabStoryArgs>;

export const Default: Story = {
  args: {
    tabNames: ['All', 'Payments', 'Top-ups'],
  },
  render: ({ tabNames, ...args }) => {
    const [active, setActive] = useState(0);
    const validTabs = Array.isArray(tabNames) ? tabNames : ['All', 'Payments', 'Top-ups'];

    return (
      <Tab {...args} size={args.size || 'large'} onChange={(idx) => { setActive(idx); args.onChange?.(idx); }}>
        {validTabs.map((name, index) => (
          <Tab.Item key={index} selected={active === index}>
            {name}
          </Tab.Item>
        ))}
      </Tab>
    );
  },
};

export const WithRedBean: Story = {
  name: 'Red Bean Indicator',
  render: () => {
    const [active, setActive] = useState(1);

    return (
      <Tab size="large" onChange={setActive}>
        <Tab.Item selected={active === 0}>News</Tab.Item>
        <Tab.Item selected={active === 1} redBean>
          Alerts (2)
        </Tab.Item>
        <Tab.Item selected={active === 2}>Settings</Tab.Item>
      </Tab>
    );
  },
};

export const LoadingState: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px' }}>
      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>Loading tabs</h4>
        <Tab isLoading onChange={() => {}}>
          <Tab.Item>Loading</Tab.Item>
        </Tab>
      </div>
    </div>
  ),
};
