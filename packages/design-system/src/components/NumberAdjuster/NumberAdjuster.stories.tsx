import type { Meta } from '@storybook/react';
import React, { useState } from 'react';
import { NumberAdjuster } from './NumberAdjuster';

const NumberAdjusterMeta: Meta = {
  component: NumberAdjuster,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label for the input',
    },
    value: {
      control: 'number',
      description: 'Current value of the input',
    },
    min: {
      control: 'number',
      description: 'Minimum value for the input',
    },
    max: {
      control: 'number',
      description: 'Maximum value for the input',
    },
    step: {
      control: 'number',
      description: 'Step value for incrementing/decrementing',
    },
    onChange: {
      action: 'changed',
      description: 'Callback function when the value changes',
    },
  },
  args: {
    label: 'Number Adjuster',
    value: 10,
  },
};

export default NumberAdjusterMeta;

export const Primary = (args) => {
  const [value, setValue] = useState(args.value);
  return <NumberAdjuster {...args} value={value} onChange={setValue} />;
};

export const StepBy10 = (args) => {
  const [value, setValue] = useState(args.value);
  return (
    <NumberAdjuster {...args} value={value} onChange={setValue} step={10} />
  );
};

export const MinMaxSet = (args) => {
  const [value, setValue] = useState(args.value);
  return (
    <NumberAdjuster
      {...args}
      value={value}
      onChange={setValue}
      min={5}
      max={50}
    />
  );
};
