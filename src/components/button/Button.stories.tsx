import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from './Button';

const ButtonMeta: Meta<typeof Button> = {
  component: Button,
  argTypes: {
    onPress: { action: 'pressed the button' },
  },
  args: {
    children: 'Hello world',
  },
};

export default ButtonMeta;
type Story = StoryObj<typeof Button>;

export const Basic: Story = {
  name: 'Test Basic',
};

export const AnotherExample: Story = {
  name: 'Contained',
  args: {
    mode: 'contained',
  },
};
