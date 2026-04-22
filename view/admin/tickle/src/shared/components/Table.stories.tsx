import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Table } from './Table';
import type { TableColumn, TableProps } from './types';
import { Badge } from './Badge';

interface UserData {
  id: number;
  name: string;
  role: string;
  status: 'Active' | 'Blocked';
  amount: string;
}

const columns: TableColumn<UserData>[] = [
  { key: 'id', header: 'No.', width: '70px', align: 'center' },
  { key: 'name', header: 'Name', width: '120px' },
  {
    key: 'status',
    header: 'Status',
    width: '100px',
    align: 'center',
    render: (row) => (
      <Badge color={row.status === 'Active' ? 'blue' : 'red'}>
        {row.status}
      </Badge>
    ),
  },
  { key: 'role', header: 'Role' },
  { key: 'amount', header: 'Amount', align: 'right' },
];

const data: UserData[] = [
  { id: 1, name: 'Jane Doe', status: 'Active', role: 'Customer', amount: '1,500,000 KRW' },
  { id: 2, name: 'John Smith', status: 'Blocked', role: 'Business', amount: '0 KRW' },
  { id: 3, name: 'Alex Kim', status: 'Active', role: 'Customer', amount: '50,000 KRW' },
];

const meta = {
  title: 'Shared/Table',
  component: Table,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean', description: 'Show loading skeleton rows' },
    tableLayout: { control: 'select', options: ['auto', 'fixed'], description: 'CSS table-layout value' },
    textAlign: { control: 'select', options: ['left', 'center', 'right'], description: 'Default horizontal alignment' },
    verticalAlign: { control: 'select', options: ['top', 'middle', 'bottom'], description: 'Default vertical alignment' },
  },
} satisfies Meta<TableProps<UserData>>;

export default meta;
type Story = StoryObj<TableProps<UserData>>;

export const Default: Story = {
  args: {
    columns,
    data,
  },
};

export const Advanced: Story = {
  args: {
    columns,
    data,
    tableLayout: 'auto',
  },
};

export const LoadingState: Story = {
  args: {
    columns,
    data: [],
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    columns,
    data: [],
  },
};
