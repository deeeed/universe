import type { Meta } from '@storybook/react';
import React from 'react';
import {
  LoadingPulseCircle,
  LoadingPulseCircleProps,
} from './loading-pulse-circle';

const LoadingPuleCircleMeta: Meta<LoadingPulseCircleProps> = {
  component: LoadingPulseCircle,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'number',
      description: 'Size of the circle',
      defaultValue: 50, // Default size
    },
    color: {
      control: 'color',
      description: 'Background color of the circle',
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
      description: 'Minimum opacity of the circle',
    },
    maxOpacity: {
      control: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Maximum opacity of the circle',
    },
  },
  args: {
    size: 50,
    color: '#ccc',
    animationDuration: 1000,
    minOpacity: 0.5,
    maxOpacity: 1,
  },
};

export default LoadingPuleCircleMeta;

export const Primary = (args: LoadingPulseCircleProps) => (
  <LoadingPulseCircle {...args} />
);

export const Large = (args: LoadingPulseCircleProps) => (
  <LoadingPulseCircle {...args} size={100} />
);

export const SlowPulse = (args: LoadingPulseCircleProps) => (
  <LoadingPulseCircle
    {...args}
    animationDuration={2000}
    minOpacity={0.2}
    maxOpacity={0.8}
  />
);

export const CustomColor = (args: LoadingPulseCircleProps) => (
  <LoadingPulseCircle {...args} color="red" />
);
