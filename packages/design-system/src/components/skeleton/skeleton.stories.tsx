import type { Meta } from '@storybook/react';
import React from 'react';
import { Skeleton, SkeletonProps } from './skeleton';

const SkeletonMeta: Meta<SkeletonProps> = {
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description:
        'Array of objects describing the number of circles and bars in each row',
    },
    circleSize: {
      control: 'number',
      description: 'Size of the circles',
      defaultValue: 50,
    },
    barHeight: {
      control: 'number',
      description: 'Height of the bars',
      defaultValue: 20,
    },
    color: {
      control: 'color',
      description: 'Color of the skeleton elements',
      defaultValue: '#ccc',
    },
    animationDuration: {
      control: 'number',
      description: 'Duration of the opacity animation in milliseconds',
      defaultValue: 1000,
    },
    minOpacity: {
      control: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Minimum opacity of the skeleton elements',
      defaultValue: 0.5,
    },
    maxOpacity: {
      control: 'range',
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Maximum opacity of the skeleton elements',
      defaultValue: 1,
    },
  },
  args: {
    circleSize: 50,
    barHeight: 20,
    color: '#ccc',
    animationDuration: 1000,
    minOpacity: 0.5,
    maxOpacity: 1,
  },
};

export default SkeletonMeta;

export const Primary = (args: SkeletonProps) => <Skeleton {...args} />;

export const Custom = (args: SkeletonProps) => (
  <Skeleton
    {...args}
    items={[
      { circles: 2, bars: 4 },
      { circles: 3, bars: 3 },
      { circles: 4, bars: 2 },
    ]}
    circleSize={30}
    barHeight={10}
    color="#4b0082"
    animationDuration={2000}
    minOpacity={0.2}
    maxOpacity={0.8}
  />
);
