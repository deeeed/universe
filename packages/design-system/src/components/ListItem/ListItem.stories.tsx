import type { Meta } from '@storybook/react';
import React from 'react';
import { ListItem, ListItemProps } from './ListItem';

const ListItemMeta: Meta<ListItemProps> = {
  component: ListItem,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text to display in the list item',
    },
  },
  args: {
    label: 'List Item',
    subLabel: 'This is the description for the item',
  },
};

export default ListItemMeta;

export const Primary = (args: ListItemProps) => <ListItem {...args} />;
