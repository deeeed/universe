import type { Meta } from '@storybook/react';
import React from 'react';
import { Pagination, PaginationProps } from './Pagination';
import { Text } from 'react-native-paper';

const PaginationMeta: Meta<PaginationProps> = {
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    total: { control: 'number' },
    current: { control: 'number' },
    pageSize: { control: 'number' },
    showQuickJumper: { control: 'boolean' },
    showSizeChanger: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    total: 150,
    defaultCurrent: 1,
    defaultPageSize: 10,
    disabled: false,
  },
};

export default PaginationMeta;

export const Basic = (args: PaginationProps) => <Pagination {...args} />;

export const WithQuickJumper = (args: PaginationProps) => (
  <Pagination
    {...args}
    showQuickJumper={true}
    defaultCurrent={1}
    defaultPageSize={10}
  />
);

export const WithSizeChanger = (args: PaginationProps) => (
  <Pagination
    {...args}
    showSizeChanger={true}
    defaultCurrent={1}
    defaultPageSize={10}
  />
);

export const Disabled = (args: PaginationProps) => (
  <Pagination {...args} disabled={true} />
);

export const WithTotal = (args: PaginationProps) => (
  <Pagination
    {...args}
    showTotal={(total, range) => (
      <Text>
        Showing {range[0]} to {range[1]} of {total} items
      </Text>
    )}
  />
);
