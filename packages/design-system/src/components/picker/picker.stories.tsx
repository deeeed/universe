// packages/design-system/src/components/picker/picker.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View } from 'react-native';
import { colorOptions } from '../../_mocks/mock_data';
import { SelectOption } from '../SelectButtons/SelectButtons';
import { Picker, PickerProps } from './Picker';
import { useToast } from '../../hooks/useToast';

const options = [
  {
    label: 'Daily Sentences',
    value: '1',
    selected: true,
  },
  {
    label: 'Custom Cards',
    value: '2',
  },
  {
    label: 'Greetings',
    value: '3',
  },
  {
    label: 'Dinings & Food',
    value: '4',
  },
  {
    label: 'Shopping',
    selected: true,
    value: '5',
  },
  {
    label: 'Direction & Transportation',
    value: '6',
  },
  {
    label: 'Accommodation',
    value: '7',
  },
];

const CategoryPickerMeta: Meta<PickerProps> = {
  component: Picker,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    label: 'Category',
    options,
    multi: true,
    onFinish(selected) {
      console.log('selected', selected);
    },
  },
};

export default CategoryPickerMeta;

export const Primary: StoryObj<PickerProps> = {
  args: {},
  // Story level custom code snippet
  parameters: {
    docs: {
      source: {
        code: '<Picker label="Category" options={options} />',
      },
    },
  },
};

export const NoSelection: StoryObj<PickerProps> = {
  args: {
    options: [],
  },
  parameters: {},
};

export const NoSelectionWithOptions: StoryObj<PickerProps> = {
  args: {
    options: [
      {
        label: 'Daily Sentences',
        value: '1',
        selected: false,
      },
    ],
  },
  parameters: {},
};

export const WithColors: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args, // Spread the default args from the meta
    options: options.map((opt, index) => ({
      ...opt,
      color: colorOptions[colorOptions.length % index]?.value,
    })),
  },
  decorators: [
    (_Story, context) => {
      const { args } = context;
      const [options, setOptions] = useState(args.options);

      const onFinish = (selected: SelectOption[]) => {
        setOptions(selected);
        args.onFinish?.(selected);
      };

      return (
        <View>
          <Picker {...args} options={options} onFinish={onFinish} />
        </View>
      );
    },
  ],
};

export const AllSelected: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args, // Spread the default args from the meta
    options: options.map((opt) => ({ ...opt, selected: true })),
  },
  parameters: {
    docs: {
      source: {
        code: '<Picker label="Category" options={options.map(opt => ({ ...opt, selected: true }))} multi={true} />',
      },
    },
  },
};

export const CustomPressBehavior: StoryObj<PickerProps> = {
  decorators: [
    (_Story, context) => {
      const { args } = context;
      const { show } = useToast();

      const onItemPress = (item: SelectOption) => {
        show({ message: `CUSTOM ACTION Item pressed: ${item.label}` });
      };

      return (
        <View>
          <Picker {...args} options={options} onItemPress={onItemPress} />
        </View>
      );
    },
  ],
  parameters: {
    docs: {
      source: {
        code: '<Picker label="Category" options={options} onItemPress={(item) => console.log("item pressed", item)} />',
      },
    },
  },
};
