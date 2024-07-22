import type { Meta } from '@storybook/react';
import React from 'react';
import { TestToasters, TestToastersProps } from './test-toaster';

const TestToastersMeta: Meta<TestToastersProps> = {
  component: TestToasters,
  // tags: ['autodocs'],
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default TestToastersMeta;

export const Primary = (args: TestToastersProps) => <TestToasters {...args} />;
