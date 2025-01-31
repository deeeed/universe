import type { Meta } from '@storybook/react';
import React from 'react';

import { DarkLightToggle, DarkLightToggleProps } from './DarkLightToggle';

const DarkLightToggleMeta: Meta<DarkLightToggleProps> = {
  component: DarkLightToggle,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default DarkLightToggleMeta;

export const Primary = (args: DarkLightToggleProps) => (
  <DarkLightToggle {...args} />
);
