import type { Meta } from '@storybook/react';
import React from 'react';
import {
  RefreshControlWeb,
  RefreshControlWebProps,
} from './refresh-control.web';

const RefreshControlWebMeta: Meta<RefreshControlWebProps> = {
  component: RefreshControlWeb,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    refreshing: false,
  },
};

export default RefreshControlWebMeta;

export const Primary = (args: RefreshControlWebProps) => (
  <RefreshControlWeb {...args} />
);
