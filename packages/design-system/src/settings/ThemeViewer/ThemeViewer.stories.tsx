import type { Meta } from '@storybook/react';
import React from 'react';
import { ThemeViewer, ThemeViewerProps } from './ThemeViewer';

const ThemeViewerMeta: Meta<ThemeViewerProps> = {
  component: ThemeViewer,
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default ThemeViewerMeta;

export const Primary = (args: ThemeViewerProps) => <ThemeViewer {...args} />;
