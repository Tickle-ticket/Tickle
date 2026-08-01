import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SegmentedControl } from './SegmentedControl';
import { useState } from 'react';
import React from 'react';

const meta = {
  title: 'Shared/SegmentedControl',
  component: SegmentedControl,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    columns: { control: 'number', description: 'CSS Grid Column 개수' },
    rows: { control: 'number', description: 'CSS Grid Row 개수' },
    size: { control: 'radio', options: ['small', 'medium', 'large'] },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

// 인터랙티브한 클릭이 가능하도록 State를 감싸는 Template
const Template = (args: ComponentProps<typeof SegmentedControl>) => {
  const [value, setValue] = useState(args.value || args.options[0].value);
  return <SegmentedControl {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: Template,
  args: {
    options: [
      { label: 'Auto', value: 'auto' },
      { label: 'Fixed', value: 'fixed' },
    ],
  },
};

export const MultiSelections: Story = {
  render: Template,
  args: {
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
      { label: 'Dates', value: 'dates' },
    ],
  },
};

export const Grid2x2: Story = {
  render: Template,
  args: {
    columns: 2,
    rows: 2,
    options: [
      { label: 'Top Left', value: '1' },
      { label: 'Top Right', value: '2' },
      { label: 'Bottom Left', value: '3' },
      { label: 'Bottom Right', value: '4' },
    ],
  },
};

export const Grid3x2: Story = {
  render: Template,
  args: {
    columns: 3,
    rows: 2,
    size: 'small',
    options: [
      { label: 'A1', value: 'a1' },
      { label: 'A2', value: 'a2' },
      { label: 'A3', value: 'a3' },
      { label: 'B1', value: 'b1' },
      { label: 'B2', value: 'b2' },
      { label: 'B3', value: 'b3' },
    ],
  },
};

export const LoadingState: Story = {
  render: Template,
  args: {
    isLoading: true,
    options: [
      { label: '옵션 1', value: '1' },
      { label: '옵션 2', value: '2' },
      { label: '옵션 3', value: '3' },
    ],
  },
};
