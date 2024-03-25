import type { Meta } from '@storybook/react';
import React from 'react';
import { Empty, EmptyProps } from './empty';

const EmptyMeta: Meta<EmptyProps> = {
  component: Empty,
  argTypes: {},
  args: {
    buttonValue: 'Browse categories',
    image: require('../../../assets/bookmarks_empty.png'),
    message: "You don't have any bookmarks yet",
    onPress() {
      console.log('onPress');
    },
  },
};

export default EmptyMeta;

export const Primary = (args: EmptyProps) => <Empty {...args} />;
