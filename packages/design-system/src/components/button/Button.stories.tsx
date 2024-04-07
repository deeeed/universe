import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const ButtonMeta: Meta<typeof Button> = {
  component: Button,
  tags: ['autodocs'],
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
  parameters: {
    docs: {
      source: {
        code: `
import { Button } from '@siteed/design-system';
<Button>A button</Button>
        `,
      },
    },
  },
};

export const AnotherExample: Story = {
  name: 'Contained',
  args: {
    mode: 'contained',
  },
  parameters: {
    docs: {
      source: {
        code: `
import { Button } from '@siteed/design-system';
<Button mode="contained">A button</Button>
        `,
      },
    },
  },
};
