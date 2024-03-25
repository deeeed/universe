import type { Meta } from '@storybook/react';
import React from 'react';
import { LockInput, LockInputProps } from './lock-input';

const LockInputMeta: Meta<LockInputProps> = {
  component: LockInput,
  argTypes: {},
  args: {
    locked: true,
    label: 'Pinyin',
    text: 'ni2 hao3',
  },
};

export default LockInputMeta;

export const Primary = (args: LockInputProps) => <LockInput {...args} />;
