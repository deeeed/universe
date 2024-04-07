import type { Meta, StoryObj } from '@storybook/react';
import { LabelSwitch, LabelSwitchProps } from './label-switch';

const LabelSwitchMeta: Meta<typeof LabelSwitch> = {
  component: LabelSwitch,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    label: 'subscribe to notification',
    value: false,
  },
};

export default LabelSwitchMeta;

export const Primary: StoryObj<LabelSwitchProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<LabelSwitch label="subscribe to notifications" value={false} />',
      },
    },
  },
};
