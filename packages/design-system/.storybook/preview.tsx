import { LoggerProvider } from "@siteed/react-native-logger"
import type { Decorator, Preview } from "@storybook/react"
import React from "react"
import { Platform, ScrollView, View } from "react-native"
import { ThemeConfig } from "../src/components/theme-config/theme-config"
import { UIProvider } from "../src/providers/ui-provider"

/** @type { import('@storybook/react').Preview } */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export const decorators: Decorator[] = [
  // Using a decorator to apply padding for every story
  (StoryFn) => {
    console.log("preview init decorators")
    return (
      <LoggerProvider>
        <>
          {Platform.OS === "web" ? (
            <style type="text/css">{`
                  @font-face {
                    font-family: 'MaterialCommunityIcons';
                    src: url(${require("react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf")}) format('truetype');
                  }
                `}
            </style>
          ) : null
          }
          <UIProvider locale={"en"}>
            <View style={{}}>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                <ThemeConfig flexDirection={"row"} />
              </ScrollView>
              <View style={{ flex: 1, padding: 8, backgroundColor: "#D3D3D3", minHeight: 300 }}>
                <StoryFn />
              </View>
            </View>
          </UIProvider>
        </>
      </LoggerProvider>
    )
  },
]


export default preview
