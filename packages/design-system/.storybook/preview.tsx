import type { Decorator, Preview } from '@storybook/react';
import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { colorOptions } from '../src/_mocks/mock_data';
import { ScreenWrapper } from '../src/components/ScreenWrapper/ScreenWrapper';
import { UIProvider } from '../src/providers/UIProvider';
import { ThemeConfig } from '../src/settings/ThemeConfig/ThemeConfig';
import { setLoggerConfig } from '@siteed/react-native-logger';

/** @type { import('@storybook/react').Preview } */
const preview: Preview = {
  parameters: {
    docs: {
      toc: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  tags: ['autodocs'],
};

const colors = colorOptions.map((colorOption) => colorOption.value);

setLoggerConfig({
  namespaces: '*',
});

export const decorators: Decorator[] = [
  // Using a decorator to apply padding for every story
  (StoryFn) => {
    console.log('preview init decorators');
    return (
      <>
        {Platform.OS === 'web' ? (
          <style type="text/css">
            {`
                  @font-face {
                    font-family: 'MaterialCommunityIcons';
                    src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
                  }
                `}
          </style>
        ) : null}
        <UIProvider locale={'en'}>
          <View>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            >
              <ThemeConfig flexDirection={'row'} colors={colors} />
            </ScrollView>
            <ScreenWrapper
              contentContainerStyle={{ minHeight: 500, padding: 8 }}
            >
              <StoryFn />
            </ScreenWrapper>
          </View>
        </UIProvider>
      </>
    );
  },
];

export default preview;
