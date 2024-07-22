import { LoggerProvider } from '@siteed/react-native-logger';
import type { Decorator, Preview } from '@storybook/react';
import React from 'react';
import { Platform, ScrollView } from 'react-native';
import { ScreenWrapper } from '../src/components/screen-wrapper/screen-wrapper';
import { UIProvider } from '../src/providers/ui-provider';
import { ThemeConfig } from '../src/settings/theme-config/theme-config';
import { colorOptions } from '../src/_mocks/mock_data';

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
};

const colors = colorOptions.map((colorOption) => colorOption.value);

export const decorators: Decorator[] = [
  // Using a decorator to apply padding for every story
  (StoryFn) => {
    console.log('preview init decorators');
    return (
      <LoggerProvider>
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
            <>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
              >
                <ThemeConfig flexDirection={'row'} colors={colors} />
              </ScrollView>
              <ScreenWrapper style={{ minHeight: 300, padding: 8 }}>
                <StoryFn />
              </ScreenWrapper>
            </>
          </UIProvider>
        </>
      </LoggerProvider>
    );
  },
];

export default preview;
