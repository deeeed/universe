import type { Meta } from '@storybook/react';
import React from 'react';
import { ThemedView, ThemedViewProps } from './ThemedView';

const ThemedViewMeta: Meta<ThemedViewProps> = {
  component: ThemedView,
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default ThemedViewMeta;

export const Primary = (args: ThemedViewProps) => <ThemedView {...args} />;
