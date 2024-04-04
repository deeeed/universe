import type { Meta } from "@storybook/react"
import React from "react"
import { AccordionItem, AccordionItemProps } from "./accordion-item"
import { Text } from "react-native-paper"

const AccordionItemMeta: Meta<AccordionItemProps> = {
  component: AccordionItem,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    expanded: true,
    title: "Accordion Item",
    children: <Text>this is the content</Text>
  },
}

export default AccordionItemMeta

export const Primary = (args: AccordionItemProps) => {
  const [selected,setSelected] = React.useState<boolean>(false)
  return <AccordionItem {...args} expanded={selected} onHeaderPress={() => {
    setSelected(!selected)
  }} />
}
