import type { Meta } from '@storybook/react';
import React from 'react';
import { Accordion, AccordionProps } from './Accordion';
import { AccordionItemProps } from './AccordionItem/AccordionItem';
import { Text } from 'react-native-paper';

// Assuming you have a predefined set of items for demonstration
const sampleData: AccordionItemProps[] = [
  {
    title: 'Item 1',
    children: <Text>Details for item 1</Text>,
    titleStyle: {},
  },
  {
    title: 'Item 2',
    children: <Text>Details for item 2</Text>,
    titleStyle: {},
  },
  {
    title: 'Item 3',
    children: <Text>Details for item 3</Text>,
    titleStyle: {},
  },
];

const AccordionMeta: Meta<AccordionProps> = {
  component: Accordion,
  tags: ['autodocs'],
  argTypes: {
    singleExpand: {
      control: 'boolean',
      description: 'Allow only one expanded item at a time',
    },
  },
  args: {
    data: sampleData,
  },
};

export default AccordionMeta;

export const Primary = (args: AccordionProps) => <Accordion {...args} />;
