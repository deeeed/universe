import type { Meta } from '@storybook/react';
import React from 'react';
import { ScreenWrapper, ScreenWrapperProps } from './screen-wrapper';
import { Text } from 'react-native-paper';

const ScreenWrapperMeta: Meta<ScreenWrapperProps> = {
  component: ScreenWrapper,
  argTypes: {},
  args: {
    // data: 'test',
  },
};

export default ScreenWrapperMeta;

export const Primary = (args: ScreenWrapperProps) => (
  <ScreenWrapper {...args}>
    <Text>This text is children of the screenwrapper</Text>
  </ScreenWrapper>
);
