import type { Meta, StoryObj } from '@storybook/react';
import { LabelHandler, LabelHandlerProps } from './LabelHandler';

// Meta configuration
const LabelHandlerMeta: Meta<LabelHandlerProps> = {
  title: 'Components/BottomModal/LabelHandler', // Define a title for the component in Storybook
  component: LabelHandler,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text', // Control type in Storybook UI
      description: 'Label text to be displayed in the handler',
      defaultValue: 'Default Label',
    },
  },
  args: {
    label: 'Sample Label',
  },
};

export default LabelHandlerMeta;

// Story for the primary variant
export const Primary: StoryObj<LabelHandlerProps> = {
  args: {
    label: 'Primary Label', // Default label text for this story
  },
};
