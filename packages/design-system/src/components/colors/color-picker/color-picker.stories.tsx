import type { Meta, StoryObj } from "@storybook/react"
import { colorOptions } from "../../../_mocks/mock_data"
import { ColorPicker, ColorPickerProps } from "./color-picker"

const ColorPickerMeta: Meta<ColorPickerProps> = {
  component: ColorPicker,
  argTypes: {},
  tags: ["autodocs"],
  args: {
    label: "Primary",
    color: "tomato",
    colorOptions: colorOptions.map((colorOption) => colorOption.value),
  },
}

export default ColorPickerMeta

export const Primary: StoryObj<ColorPickerProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `<ColorPicker
  label="Primary"
  color="tomato"
  colorOptions={${JSON.stringify(colorOptions.map((colorOption) => colorOption.value))}}
/>`,
      },
    },
  },
}
