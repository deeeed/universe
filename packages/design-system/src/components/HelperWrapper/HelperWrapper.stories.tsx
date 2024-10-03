import { TextInput, NumberAdjuster } from '@siteed/design-system';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';

import { HelperWrapper, HelperWrapperProps } from './HelperWrapper';

const HelperWrapperMeta: Meta<HelperWrapperProps> = {
  component: HelperWrapper,
  title: 'Components/HelperWrapper',
  tags: ['autodocs'],
  argTypes: {
    iconPosition: {
      control: { type: 'radio' },
      options: ['left', 'right'],
    },
    helperText: { control: 'text' },
  },
};

export default HelperWrapperMeta;

type Story = StoryObj<typeof HelperWrapper>;

const defaultArgs: Partial<HelperWrapperProps> = {
  iconPosition: 'left',
  helperText: 'This is helper text',
};

export const WithTextInput: Story = {
  args: {
    ...defaultArgs,
    helperText: 'Enter your username',
  },
  render: (args) => (
    <View style={{ width: 300 }}>
      <HelperWrapper {...args}>
        <TextInput
          placeholder="Enter username"
          onChangeText={(text) => console.log(text)}
        />
      </HelperWrapper>
    </View>
  ),
};

export const WithNumberAdjuster: Story = {
  args: {
    ...defaultArgs,
    iconPosition: 'left',
    helperText: 'Select the number of speakers',
  },
  render: (args) => (
    <View style={{ width: 300 }}>
      <HelperWrapper {...args}>
        <NumberAdjuster
          label="Number of Speakers"
          value={2}
          onChange={(value) => console.log(value)}
        />
      </HelperWrapper>
    </View>
  ),
};

export const WithIconLeft: Story = {
  args: {
    ...defaultArgs,
    iconPosition: 'left',
    helperText: 'Icon on the left',
  },
  render: WithTextInput.render,
};

export const WithIconRight: Story = {
  args: {
    ...defaultArgs,
    iconPosition: 'right',
    helperText: 'Icon on the right',
  },
  render: WithNumberAdjuster.render,
};
