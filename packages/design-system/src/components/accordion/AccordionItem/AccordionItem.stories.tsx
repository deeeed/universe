import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AccordionItem, AccordionItemProps } from './AccordionItem';
import { Text } from 'react-native-paper';

const meta: Meta<AccordionItemProps> = {
  component: AccordionItem,
  tags: ['autodocs'],
  argTypes: {
    expanded: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
    onHeaderPress: { action: 'headerPressed' },
  },
  args: {
    title: 'Accordion Item',
    children: <Text>This is the content</Text>,
  },
};

export default meta;

type Story = StoryObj<AccordionItemProps>;

export const Primary: Story = {
  render: ({ expanded: initialExpanded, ...args }) => {
    const [expanded, setExpanded] = React.useState(initialExpanded);

    React.useEffect(() => {
      setExpanded(initialExpanded);
    }, [initialExpanded]);

    return (
      <AccordionItem
        {...args}
        expanded={expanded}
        onHeaderPress={() => {
          setExpanded(!expanded);
          args.onHeaderPress?.();
        }}
      />
    );
  },
  args: {
    expanded: false,
  },
};
