import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from './ConfirmDialog';
import { View } from 'react-native';
import { Button } from '../Button/Button';
import React, { useState } from 'react';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
  },
  // decorators: [
  //   (Story) => (
  //     <View
  //       style={{ padding: 16, width: '100%', maxWidth: 500, paddingTop: 100 }}
  //     >
  //       <Story />
  //     </View>
  //   ),
  // ],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    visible: true,
    title: 'Confirm Action',
    notice: 'Are you sure you want to proceed with this action?',
  },
};

export const WithCustomButtons: Story = {
  args: {
    visible: true,
    title: 'Delete Item',
    notice: 'This action cannot be undone.',
    confirmButton: {
      label: 'Delete',
      mode: 'contained',
      style: { backgroundColor: '#DC3545' },
    },
    cancelButton: {
      label: 'Keep',
      mode: 'outlined',
    },
  },
};

export const LoadingState: Story = {
  args: {
    visible: true,
    title: 'Processing Action',
    notice: 'Please wait while we process your request.',
    confirmButton: {
      label: 'Submit',
      loading: true,
      disabled: true,
    },
    cancelButton: {
      label: 'Cancel',
      disabled: true,
    },
  },
};

// Interactive example
export const Interactive = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setIsVisible(false);
  };

  return (
    <View>
      <Button onPress={() => setIsVisible(true)}>Open Dialog</Button>
      <ConfirmDialog
        visible={isVisible}
        title="Save Changes"
        notice="Do you want to save your changes?"
        onDismiss={() => setIsVisible(false)}
        confirmButton={{
          label: 'Save',
          onPress: handleConfirm,
          loading: isLoading,
          disabled: isLoading,
        }}
        cancelButton={{
          label: 'Discard',
          onPress: () => setIsVisible(false),
          disabled: isLoading,
        }}
      />
    </View>
  );
};
