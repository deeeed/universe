import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import {
  ConfirmCancelFooter,
  ConfirmCancelFooterProps,
} from './ConfirmCancelFooter';

// Create a decorator to provide the mocked context
const withMockedBottomSheet = (Story: React.ComponentType) => {
  return (
    <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
      <Story />
    </View>
  );
};

const meta: Meta<ConfirmCancelFooterProps> = {
  title: 'Components/BottomModal/ConfirmCancelFooter',
  component: ConfirmCancelFooter,
  tags: ['autodocs'],
  decorators: [withMockedBottomSheet],
  argTypes: {
    onCancel: { action: 'cancelled' },
    onFinish: { action: 'finished' },
  },
};

export default meta;

type Story = StoryObj<ConfirmCancelFooterProps>;

export const Primary: Story = {
  args: {},
};

export const WithCustomLabels: Story = {
  args: {
    // Add custom labels here if your component supports them
    // For example:
    // cancelLabel: 'Go Back',
    // finishLabel: 'Confirm',
  },
};
