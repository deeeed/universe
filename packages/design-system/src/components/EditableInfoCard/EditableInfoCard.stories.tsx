import React, { useState } from 'react';
import { EditableInfoCard, EditableInfoCardProps } from './EditableInfoCard';
import { Meta, StoryFn } from '@storybook/react';
import { useModal } from '../../hooks/useModal';

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

export const Editable: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState('Click to edit');
  return (
    <EditableInfoCard
      {...args}
      label="Editable Item"
      value={value}
      editable={true}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          data: value,
          inputType: 'text',
        });
        if (newValue) {
          setValue(newValue as string);
        }
      }}
    />
  );
};
