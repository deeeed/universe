import type { Meta } from "@storybook/react"
import React from "react"
import { ItemPicker, ItemPickerProps } from "./item-picker"

const options = [
  {
    label: "Daily Sentences",
    value: "1",
    selected: true,
  },
  {
    label: "Custom Cards",
    value: "2",
  },
  {
    label: "Greetings",
    value: "3",
  },
  {
    label: "Dinings & Food",
    value: "4",
  },
  {
    label: "Shopping",
    selected: true,
    value: "5",
  },
  {
    label: "Direction & Transportation",
    value: "6",
  },
  {
    label: "Accommodation",
    value: "7",
  },
]

const CategoryPickerMeta: Meta<ItemPickerProps> = {
  component: ItemPicker,
  argTypes: {},
  args: {
    label: "Category",
    options,
    multi: true,
    onFinish(selected) {
      console.log("selected", selected)
    },
  },
}

export default CategoryPickerMeta

export const Primary = (args: ItemPickerProps) => <ItemPicker {...args} />

export const AllSelected = (args: ItemPickerProps) => (
  <ItemPicker
    {...args}
    options={options.map((opt) => {
      return { ...opt, selected: true }
    })}
  />
)
