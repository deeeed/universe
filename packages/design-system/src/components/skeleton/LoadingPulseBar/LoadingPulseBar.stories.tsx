import type { Meta } from '@storybook/react';
import React from 'react';
import { LoadingPulseBar, LoadingPulseBarProps } from './LoadingPulseBar';

const LoadingPulseBarMeta: Meta<LoadingPulseBarProps> = {
  component: LoadingPulseBar,
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: 'number',
      description: 'Height of the bar',
      defaultValue: 20,
    },
    width: {
      control: 'text',
      description: 'Width of the bar (e.g., 50%, 100px)',
    },
    color: {
      control: 'color',
      description: 'Background color of the bar',
    },
    animationDuration: {
      control: 'number',
      description: 'Duration of the opacity animation in milliseconds',
    },
    minOpacity: {
      control: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Minimum opacity of the bar',
    },
    maxOpacity: {
      control: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Maximum opacity of the bar',
    },
  },
  args: {
    height: 20,
    width: '100%',
    color: '#ccc',
    animationDuration: 1000,
    minOpacity: 0.5,
    maxOpacity: 1,
  },
};

export default LoadingPulseBarMeta;

export const Primary = (args: LoadingPulseBarProps) => (
  <LoadingPulseBar {...args} />
);

export const TallBar = (args: LoadingPulseBarProps) => (
  <LoadingPulseBar {...args} height={50} />
);

export const WideBar = (args: LoadingPulseBarProps) => (
  <LoadingPulseBar {...args} width="50%" color="#4b0082" />
);

export const SlowPulse = (args: LoadingPulseBarProps) => (
  <LoadingPulseBar
    {...args}
    animationDuration={2000}
    minOpacity={0.2}
    maxOpacity={0.8}
  />
);

export const CustomColor = (args: LoadingPulseBarProps) => (
  <LoadingPulseBar {...args} color="red" />
);
