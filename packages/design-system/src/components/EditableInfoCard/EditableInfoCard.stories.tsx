import React, { useState } from 'react';
import { EditableInfoCard, EditableInfoCardProps } from './EditableInfoCard';
import { Meta, StoryFn } from '@storybook/react';
import { useModal } from '../../hooks/useModal/useModal';
import { format } from 'date-fns';
import { SelectOption } from '../SelectButtons/SelectButtons';
import { Text } from 'react-native-paper';

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

export const EditableDate: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState(new Date());
  return (
    <EditableInfoCard
      {...args}
      label="Date"
      value={value}
      editable={true}
      renderValue={(val) => format(val as Date, 'PP')}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          data: value,
          inputType: 'date',
        });
        if (newValue) {
          setValue(newValue as Date);
        }
      }}
    />
  );
};

export const EditableTime: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState(new Date());
  return (
    <EditableInfoCard
      {...args}
      label="Time"
      value={value}
      editable={true}
      renderValue={(val) => format(val as Date, 'p')}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          data: value,
          inputType: 'time',
        });
        if (newValue) {
          setValue(newValue as Date);
        }
      }}
    />
  );
};

export const EditableDateTime: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState(new Date());
  return (
    <EditableInfoCard
      {...args}
      label="Date and Time"
      value={value}
      editable={true}
      renderValue={(val) => format(val as Date, 'PPp')}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          data: value,
          inputType: 'datetime',
        });
        if (newValue) {
          setValue(newValue as Date);
        }
      }}
    />
  );
};

export const EditableNumber: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState(42);
  return (
    <EditableInfoCard
      {...args}
      label="Number"
      value={value}
      editable={true}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          data: value,
          inputType: 'number',
        });
        if (newValue) {
          setValue(newValue as number);
        }
      }}
    />
  );
};

export const EditableSelect: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [options, setOptions] = useState([
    { label: 'Option A', value: 'A', selected: true },
    { label: 'Option B', value: 'B' },
    { label: 'Option C', value: 'C' },
  ]);
  return (
    <EditableInfoCard
      {...args}
      label="Select"
      value={options}
      editable={true}
      renderValue={(val) => (
        <Text>
          {(val as SelectOption[])
            .filter((v) => v.selected)
            .map((v) => v.label)
            .join(', ')}
        </Text>
      )}
      onEdit={async () => {
        const newValue = await editProp({
          bottomSheetProps: {
            enableDynamicSizing: false,
            snapPoints: ['10%', '50%', '90%'],
          },
          multiSelect: true,
          data: options,
          inputType: 'select-button',
        });
        console.log('newValue', newValue);

        if (newValue) {
          setOptions(newValue as SelectOption[]);
        }
      }}
    />
  );
};
