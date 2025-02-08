import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const TextMeta: Meta<typeof Text> = {
  component: Text,
  tags: ['autodocs'],
  args: {
    children: 'Hello world',
  },
};

export default TextMeta;
type Story = StoryObj<typeof Text>;

export const Basic: Story = {
  name: 'Default Text',
  parameters: {
    docs: {
      source: {
        code: `
import { Text } from '@siteed/design-system';
<Text>Hello world</Text>
        `,
      },
    },
  },
};

export const Variant: Story = {
  name: 'Heading Text',
  args: {
    variant: 'headlineMedium',
  },
  parameters: {
    docs: {
      source: {
        code: `
import { Text } from '@siteed/design-system';
<Text variant="headlineMedium">Hello world</Text>
        `,
      },
    },
  },
};
