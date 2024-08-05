import type { Meta, StoryObj } from '@storybook/react';
import { LockInput, LockInputProps } from './LockInput';

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

export const Primary: StoryObj<LockInputProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `
<LockInput
  locked={true}
  label="Pinyin"
  text="ni2 hao3"
/>`,
      },
    },
  },
};
