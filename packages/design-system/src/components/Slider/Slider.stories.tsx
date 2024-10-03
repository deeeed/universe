import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { Slider, SliderProps } from './Slider';

const SliderMeta: Meta<SliderProps> = {
  component: Slider,
  title: 'Components/Slider',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'number' },
    minimumValue: { control: 'number' },
    maximumValue: { control: 'number' },
    onValueChange: { action: 'onValueChange' },
    onSlidingComplete: { action: 'onSlidingComplete' },
    disabled: { control: 'boolean' },
    step: { control: 'number' },
    showValue: { control: 'boolean' },
    containerStyle: { control: 'object' },
    labelStyle: { control: 'object' },
    sliderStyle: { control: 'object' },
    valueLabelStyle: { control: 'object' },
  },
};

export default SliderMeta;

const Template: StoryFn<SliderProps> = ({ ...args }) => <Slider {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Default Slider',
  value: 50,
  minimumValue: 0,
  maximumValue: 100,
};

export const CustomRange = Template.bind({});
CustomRange.args = {
  label: 'Custom Range Slider',
  value: 25,
  minimumValue: -50,
  maximumValue: 50,
};

export const Percentage = Template.bind({});
Percentage.args = {
  label: 'Percentage Slider',
  value: 75,
  minimumValue: 0,
  maximumValue: 100,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled Slider',
  value: 30,
  minimumValue: 0,
  maximumValue: 100,
  // Note: You might need to add a 'disabled' prop to your Slider component
  // disabled: true,
};

export const CustomStyling = Template.bind({});
CustomStyling.args = {
  label: 'Custom Styled Slider',
  value: 50,
  minimumValue: 0,
  maximumValue: 100,
  showValue: true,
  containerStyle: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 8 },
  labelStyle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sliderStyle: { height: 40 },
  valueLabelStyle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
};
