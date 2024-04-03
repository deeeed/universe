import type { Meta } from "@storybook/react"
import React from "react"
import { Pressable, View } from "react-native"
import { Text as PaperText } from "react-native-paper"
import { colorOptions, randomSelectValues } from "../../_mocks/mock_data"
import { ColorItem } from "../color-item/color-item"
import { DynInput, DynInputProps } from "./dyn-input"
import { SelectOption } from "../select-buttons/select-buttons"

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


export const Custom = () => (
  <DynInput
    data={colorOptions}
    inputType="custom"
    customRender={(value, _onChange) => {

      const handlePress = (pressed: SelectOption) => {
        console.log("pressed", pressed)
      }
      if (Array.isArray(value)) {
        return <View>
          {value.map((option, index) => {
            return <Pressable key={`${option.label}-${index}`}  onPress={() => handlePress(option)}><ColorItem color={option.value} /></Pressable>
          })}
        </View>
      }
      return <PaperText>{JSON.stringify(value)}</PaperText>
    }}
  />
)
