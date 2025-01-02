import type { Meta, StoryObj } from '@storybook/react';
import { Empty, EmptyProps } from './Empty';

const EmptyMeta: Meta<EmptyProps> = {
  component: Empty,
  argTypes: {
    buttonProps: {
      control: 'object',
      description: 'Properties to customize the button',
    },
    style: {
      control: 'object',
      description: 'Styles to customize the container and image',
    },
  },
  tags: ['autodocs'],
  args: {
    buttonValue: 'Browse categories',
    image: require('../../../assets/bookmarks_empty.png'),
    message: "You don't have any bookmarks yet",
    onPress() {
      console.log('onPress');
    },
    buttonProps: {
      mode: 'outlined',
      color: 'blue',
    },
    style: {
      container: { padding: 20 },
      image: { width: 100, height: 100 },
    },
  },
};

export default EmptyMeta;

export const Primary: StoryObj<EmptyProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `
<Empty
  buttonValue="Browse categories"
  image={require("../../../assets/bookmarks_empty.png")}
  message="You don't have any bookmarks yet"
  onPress={() => console.log("onPress")}
  buttonProps={{ mode: 'outlined', color: 'blue' }}
  style={{ container: { padding: 20 }, image: { width: 100, height: 100 } }}
/>
        `,
      },
    },
  },
};

export const CustomButton: StoryObj<EmptyProps> = {
  args: {
    buttonProps: {
      mode: 'contained',
      color: 'green',
    },
  },
  parameters: {
    docs: {
      source: {
        code: `
<Empty
  buttonValue="Explore now"
  image={require("../../../assets/bookmarks_empty.png")}
  message="Start exploring your bookmarks"
  onPress={() => console.log("Explore now")}
  buttonProps={{ mode: 'contained', color: 'green' }}
/>
        `,
      },
    },
  },
};

export const CustomStyles: StoryObj<EmptyProps> = {
  args: {
    style: {
      container: { backgroundColor: '#f0f0f0', padding: 30 },
      image: { width: 120, height: 120 },
    },
  },
  parameters: {
    docs: {
      source: {
        code: `
<Empty
  buttonValue="Browse categories"
  image={require("../../../assets/bookmarks_empty.png")}
  message="You don't have any bookmarks yet"
  onPress={() => console.log("onPress")}
  style={{ container: { backgroundColor: '#f0f0f0', padding: 30 }, image: { width: 120, height: 120 } }}
/>
        `,
      },
    },
  },
};
