import { Meta, StoryFn } from '@storybook/react';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useModal } from '../../hooks/useModal/useModal';
import { SelectOption } from '../SelectButtons/SelectButtons';
import { EditableInfoCard, EditableInfoCardProps } from './EditableInfoCard';

const ItemViewMeta: Meta<EditableInfoCardProps> = {
  component: EditableInfoCard,
  argTypes: {
    onEdit: { action: 'edit clicked' },
    onInlineEdit: { action: 'inline edit completed' },
  },
  args: {
    label: 'Item Label',
    value: 'Value to display',
    processing: false,
    error: false,
    editable: false,
    inlineEditable: false,
    placeholder: 'Enter a value...',
    multiline: false,
    numberOfLines: 1,
    isSaving: false,
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

export const EditableModal: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState('Click to edit (modal only)');
  return (
    <EditableInfoCard
      {...args}
      label="Editable Item (Modal)"
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

export const EditableWithInlineAndModal: StoryFn<EditableInfoCardProps> = (
  args
) => {
  const { editProp } = useModal();
  const [value, setValue] = useState('Click to edit (inline or modal)');
  return (
    <EditableInfoCard
      {...args}
      label="Editable Item (Inline & Modal)"
      value={value}
      editable={true}
      inlineEditable={true}
      onInlineEdit={(newValue) => {
        console.log('Inline edit:', newValue);
        setValue(newValue as string);
      }}
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
          console.log('Modal edit:', newValue);
          setValue(newValue as string);
        }
      }}
    />
  );
};

export const InlineEditable: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('Click to edit inline');
  return (
    <EditableInfoCard
      {...args}
      label="Inline Editable Item"
      value={value}
      inlineEditable={true}
      onInlineEdit={(newValue) => {
        console.log('New value:', newValue);
        setValue(newValue as string);
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

export const NoLabel: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label={undefined}
    value="This card has no label"
  />
);

export const NoLabelEditable: StoryFn<EditableInfoCardProps> = (args) => {
  const { editProp } = useModal();
  const [value, setValue] = useState('Editable card without a label');
  return (
    <EditableInfoCard
      {...args}
      value={value}
      label={undefined}
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

export const CustomRightAction: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label="Custom Right Action"
    value="Click the star icon"
    rightAction={
      <IconButton
        icon="star"
        size={20}
        onPress={() => console.log('Star pressed')}
      />
    }
  />
);

export const RightActionWithPress: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label="Pressable Card"
    value="Press anywhere on the card"
    rightAction={<IconButton icon="chevron-right" size={20} />}
    onRightActionPress={() => console.log('Card pressed')}
  />
);

export const EditableWithCustomIconAndInline: StoryFn<EditableInfoCardProps> = (
  args
) => {
  const { editProp } = useModal();
  const [value, setValue] = useState(
    'Click the custom edit icon or edit inline'
  );
  return (
    <EditableInfoCard
      {...args}
      label="Custom Edit Icon with Inline"
      value={value}
      editable={true}
      inlineEditable={true}
      onInlineEdit={(newValue) => {
        console.log('Inline edit:', newValue);
        setValue(newValue as string);
      }}
      rightAction={
        <IconButton
          icon="pencil-circle"
          size={24}
          onPress={async () => {
            const newValue = await editProp({
              bottomSheetProps: {
                enableDynamicSizing: false,
                snapPoints: ['10%', '50%', '90%'],
              },
              data: value,
              inputType: 'text',
            });
            if (newValue) {
              console.log('Modal edit:', newValue);
              setValue(newValue as string);
            }
          }}
        />
      }
    />
  );
};

export const MultipleActions: StoryFn<EditableInfoCardProps> = (args) => (
  <EditableInfoCard
    {...args}
    label="Multiple Actions"
    value="Card with multiple right actions"
    rightAction={
      <View style={{ flexDirection: 'row' }}>
        <IconButton
          icon="star"
          size={20}
          onPress={() => console.log('Star pressed')}
        />
        <IconButton
          icon="share"
          size={20}
          onPress={() => console.log('Share pressed')}
        />
      </View>
    }
  />
);

export const ValidationError: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('Type numbers only');
  return (
    <EditableInfoCard
      {...args}
      label="With Validation"
      value={value}
      inlineEditable={true}
      validate={(val) => /^\d+$/.test(val) || 'Please enter numbers only'}
      onInlineEdit={(newValue) => setValue(newValue as string)}
    />
  );
};

export const MultilineEditable: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('This is a\nmultiline\ntext input');
  return (
    <EditableInfoCard
      {...args}
      label="Multiline Text"
      value={value}
      inlineEditable={true}
      multiline={true}
      numberOfLines={3}
      onInlineEdit={(newValue) => setValue(newValue as string)}
    />
  );
};

export const WithPlaceholder: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('');
  return (
    <EditableInfoCard
      {...args}
      label="With Placeholder"
      value={value}
      inlineEditable={true}
      placeholder="Type something here..."
      onInlineEdit={(newValue) => setValue(newValue as string)}
    />
  );
};

export const SaveInProgress: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('Click to edit with save animation');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = async (newValue: unknown) => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setValue(newValue as string);
    setIsSaving(false);
  };

  return (
    <EditableInfoCard
      {...args}
      label="With Save Indicator"
      value={value}
      inlineEditable={true}
      isSaving={isSaving}
      onInlineEdit={handleEdit}
    />
  );
};

export const Disabled: StoryFn<EditableInfoCardProps> = (args) => {
  const [value, setValue] = useState('This card is disabled');
  return (
    <EditableInfoCard
      {...args}
      label="Disabled Card"
      value={value}
      editable={true}
      inlineEditable={true}
      disabled={true}
      onInlineEdit={(newValue) => setValue(newValue as string)}
    />
  );
};

export const DisabledWithCustomAction: StoryFn<EditableInfoCardProps> = (
  args
) => (
  <EditableInfoCard
    {...args}
    label="Disabled with Custom Action"
    value="Disabled card with custom action"
    disabled={true}
    rightAction={
      <IconButton
        icon="star"
        size={20}
        onPress={() => console.log('Star pressed')}
        disabled={true}
      />
    }
  />
);
