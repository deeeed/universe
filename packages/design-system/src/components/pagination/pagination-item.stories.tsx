import type { Meta } from '@storybook/react';
import React from 'react';
import { PaginationItem, PaginationItemProps } from './pagination-item';

const PaginationItemMeta: Meta<PaginationItemProps> = {
  component: PaginationItem,
  tags: ['autodocs'],
  argTypes: {
    page: {
      control: 'number',
      description: 'The page number for this item',
    },
    disabled: {
      control: 'boolean',
      description: 'If true, the item is disabled',
    },
    isCurrent: {
      control: 'boolean',
      description: 'If true, the item is highlighted as the current page',
    },
    onPress: { action: 'pressed' },
  },
  args: {
    isCurrent: false,
    page: 1,
    onPress: () => {},
  },
};

export default PaginationItemMeta;

export const Default = (args: PaginationItemProps) => (
  <PaginationItem {...args} />
);

export const Current = (args: PaginationItemProps) => (
  <PaginationItem {...args} isCurrent={true} />
);

export const Disabled = (args: PaginationItemProps) => (
  <PaginationItem {...args} disabled={true} />
);
