import type { Meta } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { SwipeableToast } from './SwipeableToast';
import type { SwipeableToastProps } from './Toast.types';

const SwipeableToastMeta: Meta<SwipeableToastProps> = {
  component: SwipeableToast,
  tags: ['autodocs'],
  argTypes: {
    onDismiss: { action: 'dismissed' },
    action: { action: 'clicked' },
    swipeConfig: {
      control: 'object',
      description: 'Configure swipe behavior for dismissal',
    },
  },
  args: {
    message: 'Swipeable Toast',
    visibility: true,
    position: 'bottom',
    swipeConfig: {
      isEnabled: true,
      direction: 'both',
    },
  },
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          minHeight: 200,
          paddingTop: 200,
          position: 'relative',
          width: '100%',
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default SwipeableToastMeta;

export const Default = (args: SwipeableToastProps) => (
  <SwipeableToast {...args} />
);

export const SwipeLeftToRight = (args: SwipeableToastProps) => (
  <SwipeableToast
    {...args}
    message="👉 Swipe right to dismiss"
    swipeConfig={{ direction: 'left-to-right' }}
  />
);

export const SwipeBothDirections = (args: SwipeableToastProps) => (
  <SwipeableToast
    {...args}
    message="👈👉 Swipe either direction"
    swipeConfig={{ direction: 'both' }}
  />
);

export const SwipeDisabled = (args: SwipeableToastProps) => (
  <SwipeableToast
    {...args}
    message="🔒 Swipe disabled"
    swipeConfig={{ isEnabled: false }}
  />
);

export const WithCustomThreshold = (args: SwipeableToastProps) => (
  <SwipeableToast
    {...args}
    message="Easy to dismiss"
    swipeConfig={{
      dismissThreshold: 20,
      velocityThreshold: 300,
    }}
  />
);
