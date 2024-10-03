import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';

import { HelperText, HelperTextProps } from './HelperText';

const HelperTextMeta: Meta<HelperTextProps> = {
  component: HelperText,
  title: 'Components/HelperText',
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    iconSize: { control: 'number' },
    iconColor: { control: 'color' },
  },
  args: {
    text: 'This is a helper text',
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 20, maxWidth: 400 }}>
        <Story />
      </View>
    ),
  ],
};

export default HelperTextMeta;

type Story = StoryObj<typeof HelperText>;

export const Default: Story = {};

export const LargeIcon: Story = {
  args: {
    iconSize: 32,
    text: 'Helper text with a larger icon',
  },
};

export const CustomColor: Story = {
  args: {
    iconColor: '#FF5733',
    text: 'Helper text with custom icon color',
  },
};

export const LongText: Story = {
  args: {
    text: 'This is a longer helper text that demonstrates how the component handles multiple lines of text. It should wrap nicely and maintain proper alignment with the icon.',
  },
};

export const CustomStyles: Story = {
  args: {
    text: 'Helper text with custom styles',
    textStyle: { fontStyle: 'italic', color: '#4A90E2' },
    containerStyle: { backgroundColor: '#F0F0F0', borderRadius: 8 },
  },
};
