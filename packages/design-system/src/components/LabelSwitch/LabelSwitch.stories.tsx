import type { Meta, StoryObj } from '@storybook/react';
import { LabelSwitch, LabelSwitchProps } from './LabelSwitch';

const LabelSwitchMeta: Meta<typeof LabelSwitch> = {
  component: LabelSwitch,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    label: 'Subscribe to notifications',
    value: false,
  },
};

export default LabelSwitchMeta;

export const Primary: StoryObj<LabelSwitchProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<LabelSwitch label="Subscribe to notifications" value={false} />',
      },
    },
  },
};

export const WithCustomStyles: StoryObj<LabelSwitchProps> = {
  args: {
    containerStyle: {
      backgroundColor: '#f0f0f0',
      padding: 20,
      borderRadius: 10,
    },
    labelStyle: { fontWeight: 'bold', color: '#6200ea' },
  },
  parameters: {
    docs: {
      source: {
        code: `
<LabelSwitch 
  label="Custom Styled Switch" 
  value={false} 
  containerStyle={{ backgroundColor: '#f0f0f0', padding: 20, borderRadius: 10 }} 
  labelStyle={{ fontWeight: 'bold', color: '#6200ea' }} 
/>`,
      },
    },
  },
};

export const Disabled: StoryObj<LabelSwitchProps> = {
  args: {
    value: true,
    onValueChange: () => {},
  },
  parameters: {
    docs: {
      source: {
        code: '<LabelSwitch label="Disabled Switch" value={true} onValueChange={() => {}} />',
      },
    },
  },
};
