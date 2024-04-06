import type { Meta } from "@storybook/react"
import React from "react"
import { TextInput, TextInputProps } from "./text-input"

const TextInputMeta: Meta<TextInputProps> = {
  component: TextInput,
  tags: ["autodocs"],
  argTypes: {
    mandatory: {
      control: "boolean",
      description: "Marks the input as mandatory",
    },
    label: {
      control: "text",
      description: "Label for the input",
    },
  },
  args: {
    label: "InputLabel"
  },
}

export default TextInputMeta

export const Primary = (args: TextInputProps) => <TextInput {...args} />
