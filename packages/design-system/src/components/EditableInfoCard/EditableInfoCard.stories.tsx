import React from 'react';
import { EditableInfoCard, EditableInfoCardProps } from './EditableInfoCard';
import { Meta, StoryFn } from '@storybook/react';

const ItemViewMeta: Meta<EditableInfoCardProps> = {
  component: EditableInfoCard,
  argTypes: {
    onEdit: { action: 'edit clicked' },
  },
  args: {
    label: 'Item Label',
    value: 'Value to display',
    processing: false,
    error: false,
    editable: false,
  },
  decorators: [],
  parameters: {},
};

export default ItemViewMeta;

export const Primary: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard {...args} label="Primary Item" value="Primary value" />
);

export const Processing: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard {...args} label="Processing Item" processing={true} />
);

export const Error: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label="Error Item"
    value="Error occurred"
    error={true}
  />
);

export const Editable: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label="Editable Item"
    value="Click to edit"
    editable={true}
    onEdit={() => alert('Edit clicked!')}
  />
);
