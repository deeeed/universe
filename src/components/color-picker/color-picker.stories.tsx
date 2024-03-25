import type { Meta } from '@storybook/react';
import React from 'react';
import { ColorPicker, ColorPickerProps } from './color-picker';
import { colorOptions } from '../../_mocks/mock_data';

const ColorPickerMeta: Meta<ColorPickerProps> = {
  component: ColorPicker,
  argTypes: {},
  args: {
    label: 'Primary',
    color: 'tomato',
    colorOptions: colorOptions.map((colorOption) => colorOption.value),
  },
};

export default ColorPickerMeta;

export const Primary = (args: ColorPickerProps) => <ColorPicker {...args} />;
