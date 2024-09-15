import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { colorOptions, randomSelectValues } from '../../_mocks/mock_data';
import { ColorItem } from '../Colors/ColorItem/ColorItem';
import { DynInput, DynInputProps } from './DynInput';
import { SelectOption } from '../SelectButtons/SelectButtons';

const DynInputMeta: Meta<DynInputProps> = {
  component: DynInput,
  argTypes: {},
  args: {
    data: 'test',
    inputType: 'text',
    onChange: (value) => console.log('Value changed:', value),
  },
};

export default DynInputMeta;

export const Text: StoryObj<DynInputProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<DynInput data="test" inputType="text" onChange={(value) => console.log("Value changed:", value)} />',
      },
    },
  },
};

export const Number: StoryObj<DynInputProps> = {
  args: {
    data: 123,
    inputType: 'number',
  },
  parameters: {
    docs: {
      source: {
        code: '<DynInput data={123} inputType="number" onChange={(value) => console.log("Value changed:", value)} />',
      },
    },
  },
};

export const SelectButtons: StoryObj<DynInputProps> = {
  args: {
    data: randomSelectValues,
    inputType: 'select-button',
    multiSelect: true,
    max: 2,
  },
  parameters: {
    docs: {
      source: {
        code: `<DynInput 
          data={${JSON.stringify(randomSelectValues)}} 
          inputType="select-button" 
          multiSelect={true} 
          max={2} 
          onChange={(value) => console.log("Value changed:", value)}
        />`,
      },
    },
  },
};

export const Custom: StoryObj<DynInputProps> = {
  args: {
    data: colorOptions,
    inputType: 'custom',
    customRender: (value, onChange) => {
      const handlePress = (pressed: SelectOption) => {
        console.log('pressed', pressed);
        onChange(pressed);
      };

      if (Array.isArray(value)) {
        return (
          <View>
            {value.map((option, index) => (
              <ColorItem
                key={`${option.label}-${index}`}
                color={option.value}
                label={option.label}
                onPress={() => handlePress(option)}
              />
            ))}
          </View>
        );
      }

      return <PaperText>{JSON.stringify(value)}</PaperText>;
    },
  },
  parameters: {
    docs: {
      source: {
        code: `// Custom render function example
<DynInput
  data={colorOptions}
  inputType="custom"
  onChange={(value) => console.log("Value changed:", value)}
  customRender={(value, onChange) => {
    const handlePress = (pressed) => {
      console.log("pressed", pressed);
      onChange(pressed);
    };

    if (Array.isArray(value)) {
      return (
        <View>
          {value.map((option, index) => (
            <ColorItem
              key={\`\${option.label}-\${index}\`}
              color={option.value}
              label={option.label}
              onPress={() => handlePress(option)}
            />
          ))}
        </View>
      );
    }

    return <PaperText>{JSON.stringify(value)}</PaperText>;
  }}
/>`,
      },
    },
  },
};

export const DateInput: StoryObj<DynInputProps> = {
  args: {
    data: new Date(),
    inputType: 'date',
    showFooter: false,
  },
  parameters: {
    docs: {
      source: {
        code: '<DynInput data={new Date()} inputType="date" onChange={(value) => console.log("Date changed:", value)} onFinish={(selectedDate) => console.log("Selected date:", selectedDate)} />',
      },
    },
  },
};

export const DateTimeInput: StoryObj<DynInputProps> = {
  args: {
    data: new Date(),
    inputType: 'date',
    dateMode: 'datetime',
    showFooter: false,
  },
  parameters: {
    docs: {
      source: {
        code: '<DynInput data={new Date()} inputType="date" dateMode="datetime" onChange={(value) => console.log("DateTime changed:", value)} onFinish={(selectedDateTime) => console.log("Selected date and time:", selectedDateTime)} />',
      },
    },
  },
};

export const TimeInput: StoryObj<DynInputProps> = {
  args: {
    data: new Date(),
    inputType: 'date',
    dateMode: 'time',
  },
  parameters: {
    docs: {
      source: {
        code: '<DynInput data={new Date()} inputType="date" dateMode="time" onChange={(value) => console.log("Time changed:", value)} onFinish={(selectedTime) => console.log("Selected time:", selectedTime)} />',
      },
    },
  },
};
