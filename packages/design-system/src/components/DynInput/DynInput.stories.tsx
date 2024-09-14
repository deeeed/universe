import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { colorOptions, randomSelectValues } from '../../_mocks/mock_data';
import { ColorItem } from '../Colors/ColorItem/ColorItem';
import { DynInput, DynInputProps } from './DynInput';
import { SelectOption } from '../SelectButtons/SelectButtons';

const DynInputMeta: Meta<DynInputProps> = {
  component: DynInput,
  argTypes: {},
  // tags: ["autodocs"],
  args: {
    data: 'test',
    inputType: 'text',
  },
};

export default DynInputMeta;

export const Text: StoryObj<DynInputProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<DynInput data="test" inputType="text" />',
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
        code: '<DynInput data={123} inputType="number" />',
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
        code: `<DynInput data={${JSON.stringify(randomSelectValues)}} inputType="select-button" multiSelect={true} max={2} />`,
      },
    },
  },
};

export const Custom: StoryObj<DynInputProps> = {
  args: {
    data: colorOptions,
    inputType: 'custom',
    customRender: (value, _onChange) => {
      const handlePress = (pressed: SelectOption) => {
        console.log('pressed', pressed);
      };

      if (Array.isArray(value)) {
        return (
          <View>
            {value.map((option, index) => {
              return (
                <Pressable
                  key={`${option.label}-${index}`}
                  onPress={() => handlePress(option)}
                >
                  <ColorItem color={option.value} />
                </Pressable>
              );
            })}
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
  customRender={(value, _onChange) => {
    const handlePress = (pressed) => {
      console.log("pressed", pressed);
    };

    if (Array.isArray(value)) {
      return (
        <View>
          {value.map((option, index) => (
            <Pressable key={\`\${option.label}-\${index}\`} onPress={() => handlePress(option)}>
              <ColorItem color={option.value} />
            </Pressable>
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
        code: '<DynInput data={new Date()} inputType="date" onFinish={(selectedDate) => console.log("Selected date:", selectedDate)} />',
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
        code: '<DynInput data={new Date()} inputType="date" dateMode="datetime" onFinish={(selectedDateTime) => console.log("Selected date and time:", selectedDateTime)} />',
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
        code: '<DynInput data={new Date()} inputType="date" dateMode="time" onFinish={(selectedTime) => console.log("Selected time:", selectedTime)} />',
      },
    },
  },
};
