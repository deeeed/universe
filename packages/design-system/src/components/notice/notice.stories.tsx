import type { Meta } from '@storybook/react';
import React from 'react';
import { Notice, NoticeProps } from './Notice';

const NoticeMeta: Meta<NoticeProps> = {
  component: Notice,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    withIcon: { control: 'boolean' },
    onClose: { action: 'closed' },
  },
  args: {
    onClose: undefined,
    closable: true,
  },
};

export default NoticeMeta;

export const Info = (args: NoticeProps) => <Notice {...args} />;
Info.args = {
  title: 'Information',
  message: 'This is an informational message.',
  type: 'info',
  onClose: undefined,
  withIcon: true,
};

export const success = (args: NoticeProps) => <Notice {...args} />;
success.args = {
  title: 'Success',
  message: 'This is a success message.',
  type: 'success',
  onClose: undefined,
  withIcon: true,
};

export const warning = (args: NoticeProps) => <Notice {...args} />;
warning.args = {
  title: 'Warning',
  message: 'This is a warning message.',
  type: 'warning',
  onClose: undefined,
  withIcon: true,
};

export const error = (args: NoticeProps) => <Notice {...args} />;
error.args = {
  title: 'Error',
  message: 'This is an error message.',
  type: 'error',
  onClose: undefined,
  withIcon: true,
};

export const CustomClose = (args: NoticeProps) => <Notice {...args} />;
CustomClose.args = {
  title: 'Custom Close',
  message: undefined,
  type: 'info',
  onClose: () => {
    console.log('Closed');
  },
  withIcon: true,
};
