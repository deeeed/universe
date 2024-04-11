import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Result, ResultProps } from './result';
import { Text } from 'react-native-paper';

const ResultMeta: Meta<ResultProps> = {
  component: Result,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    title: 'Your operation has been executed successfully!',
    message: '',
    buttonText: 'Button',
    status: 'info',
  },
};

export default ResultMeta;

export const BasicUsage: StoryObj<ResultProps> = {
  args: {},
  // Story level custom code snippet
  parameters: {},
};

export const Error: StoryObj<ResultProps> = {
  args: {
    status: 'error',
    title: 'Your operation has failed!',
    message: 'Please try again later.',
  },
  // Story level custom code snippet
  parameters: {},
};

export const Warning: StoryObj<ResultProps> = {
  args: {
    status: 'warning',
    title: 'Warning!',
    message: 'Please be careful.',
  },
  // Story level custom code snippet
  parameters: {},
};

export const Success: StoryObj<ResultProps> = {
  args: {
    status: 'success',
    title: 'Congratulations!',
    message: 'You have successfully completed the operation.',
  },
  // Story level custom code snippet
  parameters: {},
};

export const CustomImage: StoryObj<ResultProps> = {
  args: {
    status: 'info',
    title: 'Your operation has been executed successfully!',
    message: '',
    buttonText: 'Button',
    imgUrl: require('../../../assets/bookmarks_empty.png'),
    imgStyle: { width: 150, height: 150 },
  },
  // Story level custom code snippet
  parameters: {},
};

export const WithExtra: StoryObj<ResultProps> = {
  args: {
    status: 'info',
    title: 'Your operation has been executed successfully!',
    message: '',
    buttonText: 'Button',
    secondaryButtonText: 'Secondary Button',
    secondaryButtonMode: 'outlined',
    extra: <Text>This is anohter extra text</Text>,
  },
  // Story level custom code snippet
  parameters: {},
};
