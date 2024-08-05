import type { Meta } from '@storybook/react';
import React from 'react';
import { Toast, ToastProps } from './Toast';

const ToastMeta: Meta<ToastProps> = {
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    onDismiss: { action: 'dismissed' },
    action: { action: 'clicked' },
  },
  args: {
    message: 'Information message',
    subMessage: 'More details about the info',
    type: 'info',
    position: 'top',
    duration: 3000,
    visibility: true,
    iconVisible: true,
    onDismiss() {
      console.log('this is dismissed');
    },
    action: undefined,
    loading: false,
  },
};

export default ToastMeta;

export const Info = (args: ToastProps) => <Toast {...args} />;

export const Success = (args: ToastProps) => (
  <Toast {...args} message="Success message" type="success" />
);

export const SuccessWithAction = (args: ToastProps) => (
  <Toast {...args} message="Success message" type="success" action={() => {}} />
);

export const Warning = (args: ToastProps) => (
  <Toast {...args} message="Warning message" type="warning" />
);

export const Error = (args: ToastProps) => (
  <Toast {...args} message="Error message" type="error" />
);

export const Loading = (args: ToastProps) => (
  <Toast {...args} message="Loading message" loading />
);
