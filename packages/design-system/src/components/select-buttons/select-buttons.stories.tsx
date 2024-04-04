import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { randomSelectValues } from "../../_mocks/mock_data"
import {
  SelectButtons,
  SelectButtonsProps,
  SelectOption,
} from "./select-buttons"

const SelectButtonsMeta: Meta<SelectButtonsProps> = {
  component: SelectButtons,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    showSearch: false,
    options: [
      randomSelectValues[1],
      randomSelectValues[2],
      randomSelectValues[3],
    ] as SelectOption[],
  },
}

export default SelectButtonsMeta


export const Default: StoryObj<SelectButtonsProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `// Assuming randomSelectValues is imported from "../../_mocks/mock_data"
<SelectButtons
  showSearch={false}
  options={[
    randomSelectValues[1],
    randomSelectValues[2],
    randomSelectValues[3],
  ]}
/>`,
      },
    },
  },
}
Default.storyName = "Default Settings"

export const Multi: StoryObj<SelectButtonsProps> = {
  args: {
    multiSelect: true,
    min: 1,
    max: 2,
  },
  parameters: {
    docs: {
      source: {
        code: `// Assuming randomSelectValues is imported from "../../_mocks/mock_data"
<SelectButtons
  showSearch={false}
  options={[
    randomSelectValues[1],
    randomSelectValues[2],
    randomSelectValues[3],
  ]}
  multiSelect={true}
  min={1}
  max={2}
/>`,
      },
    },
  },
}

export const MultiLong: StoryObj<SelectButtonsProps> = {
  args: {
    options: randomSelectValues,
    multiSelect: true,
    min: 1,
    max: 5,
  },
  parameters: {
    docs: {
      source: {
        code: `// Assuming randomSelectValues is imported from "../../_mocks/mock_data"
<SelectButtons
  showSearch={false}
  options={randomSelectValues}
  multiSelect={true}
  min={1}
  max={5}
/>`,
      },
    },
  },
}
