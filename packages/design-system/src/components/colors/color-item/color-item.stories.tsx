import type { Meta, StoryObj } from '@storybook/react';
import { ColorItem, ColorItemProps } from './color-item';

const ColorItemMeta: Meta<ColorItemProps> = {
  component: ColorItem,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    color: 'red',
  },
};

export default ColorItemMeta;

export const Primary: StoryObj<ColorItemProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<ColorItem color="red" />',
      },
    },
  },
};

export const WithLabel: StoryObj<ColorItemProps> = {
  args: {
    label: 'Background',
  },
  parameters: {
    docs: {
      source: {
        code: '<ColorItem color="red" label="Background" />',
      },
    },
  },
};
