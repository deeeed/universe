import type { Meta } from '@storybook/react';
import React from 'react';
import { randomSelectValues } from '../../_mocks/mock_data';
import {
  SelectButtons,
  SelectButtonsProps,
  SelectOption,
} from './select-buttons';

const SelectButtonsMeta: Meta<SelectButtonsProps> = {
  component: SelectButtons,
  argTypes: {},
  args: {
    showSearch: false,
    options: [
      randomSelectValues[1],
      randomSelectValues[2],
      randomSelectValues[3],
    ] as SelectOption[],
  },
};

export default SelectButtonsMeta;

export const Default = (args: SelectButtonsProps) => (
  <SelectButtons {...args} />
);
Default.storyName = 'Default Settings';

export const Multi = (args: SelectButtonsProps) => (
  <SelectButtons {...args} multiSelect={true} min={1} max={2} />
);

export const MultiLong = (args: SelectButtonsProps) => (
  <SelectButtons
    {...args}
    options={randomSelectValues}
    multiSelect={true}
    min={1}
    max={5}
  />
);
