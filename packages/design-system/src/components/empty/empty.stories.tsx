import type { Meta, StoryObj } from "@storybook/react"
import { Empty, EmptyProps } from "./empty"

const EmptyMeta: Meta<EmptyProps> = {
  component: Empty,
  argTypes: {},
  tags: ["autodocs"],
  args: {
    buttonValue: "Browse categories",
    image: require("../../../assets/bookmarks_empty.png"),
    message: "You don't have any bookmarks yet",
    onPress() {
      console.log("onPress")
    },
  },
}

export default EmptyMeta

export const Primary: StoryObj<EmptyProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `
<Empty
  buttonValue="Browse categories"
  image={require("../../../assets/bookmarks_empty.png")}
  message="You don't have any bookmarks yet"
  onPress={() => console.log("onPress")}
/>
        `,
      },
    },
  },
}
