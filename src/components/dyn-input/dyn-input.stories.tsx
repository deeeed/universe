import type { Meta } from "@storybook/react"
import React from "react"
import { DynInput, DynInputProps } from "./dyn-input"
import { randomSelectValues } from "../../_mocks/mock_data"

const DynInputMeta: Meta<DynInputProps> = {
  component: DynInput,
  argTypes: {},
  args: {
    data: "test",
    inputType: "text",
  },
}

export default DynInputMeta

export const Text = (args: DynInputProps) => <DynInput {...args} />
export const Number = () => <DynInput data={123} inputType="number" />
export const SelectButtons = () => (
  <DynInput
    data={randomSelectValues}
    inputType="select-button"
    multiSelect={true}
    max={2}
  />
)
