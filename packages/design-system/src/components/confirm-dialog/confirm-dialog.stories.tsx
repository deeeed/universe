import type { Meta } from '@storybook/react';
import React from 'react';
import { ConfirmDialog, ConfirmDialogProps } from './confirm-dialog';
import { View } from 'react-native';

const ConfirmDialogMeta: Meta<ConfirmDialogProps> = {
  component: ConfirmDialog,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the dialog',
    },
    notice: {
      control: 'text',
      description: 'Optional notice message',
    },
    confirmLabel: {
      control: 'text',
      description: 'Label for the confirm button',
      defaultValue: 'Yes',
    },
    cancelLabel: {
      control: 'text',
      description: 'Label for the cancel button',
      defaultValue: 'No',
    },
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
  args: {
    title: 'Are you sure?',
    notice: 'This action cannot be undone.',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
  },
};

export default ConfirmDialogMeta;

export const Primary = (args: ConfirmDialogProps) => (
  <View style={{ minHeight: 400 }}>
    <ConfirmDialog {...args} />
  </View>
);

export const WithoutNotice = (args: ConfirmDialogProps) => (
  <View style={{ minHeight: 400 }}>
    <ConfirmDialog {...args} notice={undefined} />
  </View>
);

export const CustomLabels = (args: ConfirmDialogProps) => (
  <View style={{ minHeight: 400 }}>
    <ConfirmDialog
      {...args}
      confirmLabel="Yes, Proceed"
      cancelLabel="No, Go back"
    />
  </View>
);
