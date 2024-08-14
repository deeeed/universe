import type { Meta } from '@storybook/react';
import React from 'react';
import { TestBottomSheet, TestBottomSheetProps } from './TestBottomSheet';

const TestBottomSheetMeta: Meta<TestBottomSheetProps> = {
  component: TestBottomSheet,
  //   tags: ['autodocs'],
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default TestBottomSheetMeta;

export const Primary = (args: TestBottomSheetProps) => (
  <TestBottomSheet {...args} />
);
