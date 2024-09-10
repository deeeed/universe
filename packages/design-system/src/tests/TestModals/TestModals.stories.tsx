import type { Meta } from '@storybook/react';
import React from 'react';
import { TestModals, TestModalsProps } from './TestModals';

const TestModalsMeta: Meta<TestModalsProps> = {
  component: TestModals,
  //   tags: ['autodocs'],
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default TestModalsMeta;

export const Primary = (args: TestModalsProps) => <TestModals {...args} />;
