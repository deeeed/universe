import type { Meta } from "@storybook/react"
import React from "react"
import { ThemeConfig, ThemeConfigProps } from "./theme-config"
import { colorOptions } from "../../_mocks/mock_data"

const colors = colorOptions.map((colorOption) => colorOption.value)


const ThemeConfigMeta: Meta<ThemeConfigProps> = {
  component: ThemeConfig,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    colors
  },
}

export default ThemeConfigMeta


export const Primary = (args: ThemeConfigProps) => <ThemeConfig {...args} />
