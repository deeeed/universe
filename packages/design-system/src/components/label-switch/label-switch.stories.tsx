import type { Meta } from "@storybook/react"
import React from "react"
import { LabelSwitch, LabelSwitchProps } from "./label-switch"

const LabelSwitchMeta: Meta<typeof LabelSwitch> = {
  component: LabelSwitch,
  argTypes: {},
  args: {
    label: "subscribe to notification",
    value: false,
  },
}

export default LabelSwitchMeta

export const Primary = (args: LabelSwitchProps) => <LabelSwitch {...args} />
