import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import {
  ConfirmCancelFooter,
  ConfirmCancelFooterProps,
} from './ConfirmCancelFooter';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

// Create a decorator to provide the mocked context
const withMockedBottomSheet = (Story: React.ComponentType) => {
  return (
    <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
      <BottomSheetModal>
        <Story />
      </BottomSheetModal>
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
