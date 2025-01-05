import type { Meta } from '@storybook/react';
import React from 'react';
import { Toast, ToastProps } from './Toast';

const ToastMeta: Meta<ToastProps> = {
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    onDismiss: { action: 'dismissed' },
    action: { action: 'clicked' },
    themeOverrides: {
      control: 'object',
      description: 'Override default theme colors and type-specific styles',
    },
  },
  args: {
    message: 'Information message',
    subMessage: 'More details about the info',
    type: 'info',
    position: 'top',
    duration: 3000,
    visibility: true,
    iconVisible: true,
  },
};

export default ToastMeta;

export const Default = (args: ToastProps) => <Toast {...args} />;

export const Success = (args: ToastProps) => (
  <Toast {...args} message="Success message" type="success" />
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

export const GlobalThemeOverride = (args: ToastProps) => (
  <Toast
    {...args}
    message="Global theme override"
    themeOverrides={{
      background: '#2D3748',
      text: '#FFFFFF',
    }}
  />
);

export const TypeSpecificStyles = (args: ToastProps) => (
  <>
    <Toast
      {...args}
      message="Success with custom style"
      type="success"
      themeOverrides={{
        typeStyles: {
          success: {
            backgroundColor: '#064E3B',
            textColor: '#ECFDF5',
            iconColor: '#34D399',
          },
        },
      }}
    />
    <br />
    <Toast
      {...args}
      message="Error with custom style"
      type="error"
      themeOverrides={{
        typeStyles: {
          error: {
            backgroundColor: '#7F1D1D',
            textColor: '#FEE2E2',
            iconColor: '#F87171',
          },
        },
      }}
    />
  </>
);

export const MixedOverrides = (args: ToastProps) => (
  <Toast
    {...args}
    message="Mixed global and type-specific overrides"
    type="info"
    themeOverrides={{
      background: '#1E293B', // Default background
      text: '#E2E8F0', // Default text
      typeStyles: {
        info: {
          backgroundColor: '#0C4A6E', // Type-specific override
          textColor: '#BAE6FD',
          iconColor: '#38BDF8',
        },
      },
    }}
  />
);

export const WithAction = (args: ToastProps) => (
  <Toast
    {...args}
    message="Action toast"
    action={() => console.log('Action clicked')}
    actionLabel="Undo"
  />
);
