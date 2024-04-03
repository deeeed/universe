import type { Meta } from "@storybook/react"
import React from "react"
import { ColorItem, ColorItemProps } from "./color-item"

const ColorItemMeta: Meta<ColorItemProps> = {
  component: ColorItem,
  argTypes: {},
  args: {
    color: "red"
  },
}

export default ColorItemMeta

export const Primary = (args: ColorItemProps) => <ColorItem {...args} />
export const WithLabel = (args: ColorItemProps) => <ColorItem {...args} label={"Background"} />
