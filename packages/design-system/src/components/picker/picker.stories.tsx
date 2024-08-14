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
  title: 'Components/Picker',
  tags: ['autodocs'],
  argTypes: {
    // You can customize controls here if needed
  },
  args: {
    label: 'Category',
    options,
    multi: true,
    onFinish(selected) {
      console.log('Selected options:', selected);
    },
  },
};

export default CategoryPickerMeta;

export const Primary: StoryObj<PickerProps> = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'The primary `Picker` component allowing multiple selections. The selected options are logged in the console.',
      },
      source: {
        code: '<Picker label="Category" options={options} multi={true} />',
      },
    },
  },
};

export const WithSearch: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args,
    showSearch: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'This variant enables the search functionality, allowing users to filter options by typing in the search field.',
      },
      source: {
        code: `
<Picker 
  label="Category" 
  options={options} 
  multi={true} 
  showSearch={true} 
/>
        `,
      },
    },
  },
};

export const EmptyState: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args,
    options: [],
    emptyLabel: 'No categories available',
  },
  parameters: {
    docs: {
      description: {
        story:
          'This variant demonstrates how the `Picker` component handles an empty state when no options are provided.',
      },
      source: {
        code: `
<Picker 
  label="Category" 
  options={[]} 
  multi={true} 
  emptyLabel="No categories available" 
/>
        `,
      },
    },
  },
};

export const WrapOptions: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args,
    fullWidthOptions: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'This variant of the `Picker` displays options that do not take up the full width of the modal, showcasing how options are laid out with `fullWidthOptions=false`.',
      },
      source: {
        code: `
<Picker 
  label="Category" 
  options={options} 
  multi={true} 
  fullWidthOptions={false} 
/>
        `,
      },
    },
  },
};

export const NoSelection: StoryObj<PickerProps> = {
  args: {
    options: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'This variant of the `Picker` shows an empty state when no options are available.',
      },
      source: {
        code: '<Picker label="Category" options={[]} multi={true} />',
      },
    },
  },
};

export const NoSelectionWithOptions: StoryObj<PickerProps> = {
  args: {
    options: [{ label: 'Daily Sentences', value: '1', selected: false }],
  },
  parameters: {
    docs: {
      description: {
        story:
          'This variant of the `Picker` shows a single option that is not selected.',
      },
      source: {
        code: `
<Picker 
  label="Category" 
  options={[{ label: 'Daily Sentences', value: '1', selected: false }]} 
  multi={true} 
/>
        `,
      },
    },
  },
};
export const WithColors: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args, // Spread the default args from the meta
    options: options.map((opt, index) => ({
      ...opt,
      color: colorOptions[index % colorOptions.length]?.value,
    })),
  },
  decorators: [
    (Story, context) => {
      const { args } = context;
      const [options, setOptions] = useState(args.options);

      const onFinish = (selected: SelectOption[]) => {
        setOptions(selected);
        args.onFinish?.(selected);
      };

      return (
        <View>
          <Story {...args} options={options} onFinish={onFinish} />
        </View>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'This variant of the `Picker` showcases options with assigned colors, allowing for a more visual selection process.',
      },
      source: {
        code: `
const optionsWithColors = options.map((opt, index) => ({
  ...opt,
  color: colorOptions[index % colorOptions.length]?.value,
}));

<Picker 
  label="Category" 
  options={optionsWithColors} 
  multi={true} 
/>
        `,
      },
    },
  },
};

export const AllSelected: StoryObj<PickerProps> = {
  args: {
    ...CategoryPickerMeta.args, // Spread the default args from the meta
    options: options.map((opt) => ({ ...opt, selected: true })),
  },
  parameters: {
    docs: {
      description: {
        story:
          "In this variant, all options are pre-selected, demonstrating the component's state when all options are chosen by default.",
      },
      source: {
        code: `
const allSelectedOptions = options.map(opt => ({ ...opt, selected: true }));

<Picker 
  label="Category" 
  options={allSelectedOptions} 
  multi={true} 
/>
        `,
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
