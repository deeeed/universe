import type { Meta } from '@storybook/react';
import React from 'react';
import { Avatar, AvatarProps } from './avatar';

const AvatarMeta: Meta<AvatarProps> = {
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default AvatarMeta;

export const Primary = (args: AvatarProps) => <Avatar {...args} />;
