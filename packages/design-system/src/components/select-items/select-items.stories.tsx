import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { View } from "react-native"
import { Text } from "react-native-paper"
import {
  SelectItemOption,
  SelectItems,
  SelectItemsProps,
} from "./select-items"

interface ItemData {
  id: string;
  name: string;
}

const sampleData: SelectItemOption<ItemData>[] = [
  { label: "Apple", item: { id: "1", name: "Apple" } },
  { label: "Banana", item: { id: "2", name: "Banana" } },
  { label: "Cherry", item: { id: "3", name: "Cherry" } },
  { label: "Strawberry", item: { id: "4", name: "Strawberry" } },
  // ... add more as needed
]

const renderSampleItem = ({
  item,
  index,
  onChange,
}: {
  item: SelectItemOption<ItemData>;
  index: number;
  onChange?: ({
    item,
    index,
  }: {
    item: SelectItemOption<ItemData>;
    index: number;
  }) => void;
}) => {
  return (
    <View
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        backgroundColor: item.selected ? "red" : "white",
      }}
    >
      <Text
        style={{ flex: 1 }}
        onPress={() =>
          onChange?.({ item: { ...item, selected: !item.selected }, index })
        }
      >
        {item.label}
      </Text>
    </View>
  )
}

const SelectItemsMeta: Meta<SelectItemsProps<ItemData>> = {
  component: SelectItems,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    options: sampleData,
    renderItem: renderSampleItem,
  },
}

export default SelectItemsMeta

export const SingleSelectWithoutSearch: StoryObj<SelectItemsProps<ItemData>> = {
  args: {
    multiSelect: false,
    showSearch: false,
  },
  parameters: {
    docs: {
      source: {
        code: `
interface ItemData {
  id: string;
  name: string;
}

const sampleData: SelectItemOption<ItemData>[] = [
  { label: "Apple", item: { id: "1", name: "Apple" } },
  { label: "Banana", item: { id: "2", name: "Banana" } },
  { label: "Cherry", item: { id: "3", name: "Cherry" } },
  { label: "Strawberry", item: { id: "4", name: "Strawberry" } },
  // ... add more as needed
]

<SelectItems<ItemData>
  options={sampleData}
  renderItem={renderSampleItem}
  multiSelect={false}
  showSearch={false}
/>`,
      },
    },
  },
}

export const MultiSelectWithSearch: StoryObj<SelectItemsProps<ItemData>> = {
  args: {
    multiSelect: true,
    showSearch: true,
  },
  parameters: {
    docs: {
      source: {
        code: `// Assuming sampleData and renderSampleItem are imported or defined above
<SelectItems<ItemData>
  options={sampleData}
  renderItem={renderSampleItem}
  multiSelect={true}
  showSearch={true}
/>`,
      },
    },
  },
}

export const DisplayWithTwoColumns: StoryObj<SelectItemsProps<ItemData>> = {
  args: {
    multiSelect: true,
    showSearch: true,
    cols: 2,
  },
  parameters: {
    docs: {
      source: {
        code: `// Assuming sampleData and renderSampleItem are imported or defined above
<SelectItems<ItemData>
  options={sampleData}
  renderItem={renderSampleItem}
  multiSelect={true}
  showSearch={true}
  cols={2}
/>`,
      },
    },
  },
}
