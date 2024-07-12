// packages/design-system/src/components/refresh-control/refresh-control.tsx
import { Feather } from '@expo/vector-icons';
import { useLogger } from '@siteed/react-native-logger';
import React, { useEffect, useRef } from 'react';
import {
  Platform,
  RefreshControl as RefreshControlRN,
  RefreshControlProps,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {},
  pullingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export interface RefreshControlWebProps extends RefreshControlProps {
  PullingIndicator?: () => React.ReactNode;
  RefreshingIndicator?: () => React.ReactNode;
}

const maxTranslateY = 50;
const refreshThreshold = 20;
const hiddenCursorY = -20;

const DefaultPullingIndicator = () => {
  return <Feather name="arrow-down" size={24} color="black" />;
};

const DefaultRefreshingIndicator = () => {
  return <ActivityIndicator />;
};

const RefreshControlWeb: React.FC<RefreshControlWebProps> = ({
  refreshing,
  onRefresh,
  PullingIndicator = DefaultPullingIndicator,
  RefreshingIndicator = DefaultRefreshingIndicator,
  children,
}) => {
  const initialTranslateY = useRef(0);
  const translateY = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const cursorPositionY = useSharedValue(0);
  const { logger } = useLogger('todo-refresh-control');

  useEffect(() => {
    if (!refreshing) {
      translateY.value = withTiming(0, { duration: 180 });
    }
  }, [refreshing]);

  const tap = Gesture.Pan()
    .onStart((_e) => {
      initialTranslateY.current = translateY.value;
    })
    .onChange((e) => {
      let newTranslateY = translateY.value + e.changeY;
      const distance = newTranslateY - initialTranslateY.current;
      if (newTranslateY < 0) {
        newTranslateY = 0;
      } else if (newTranslateY >= maxTranslateY) {
        newTranslateY = maxTranslateY;
      }

      cursorPositionY.value = Math.min(10, newTranslateY);
      cursorOpacity.value = 0.5 + (newTranslateY / maxTranslateY) * 0.5;

      logger.debug(
        `distance: ${distance}, newTranslateY: ${newTranslateY} ==> translateY: ${translateY.value}`
      );
      translateY.value = newTranslateY;
    })
    .onEnd(() => {
      logger.log('end drag', translateY.value);
      if (translateY.value > refreshThreshold) {
        translateY.value = withSpring(0);
        onRefresh?.();
      }
      cursorOpacity.value = 0;
      cursorPositionY.value = hiddenCursorY;
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const cursorAnimatedStyles = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ translateY: cursorPositionY.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.container, animatedStyles]}>
        <>
          {refreshing ? (
            <RefreshingIndicator />
          ) : (
            <>
              <Animated.View
                style={[styles.pullingContainer, cursorAnimatedStyles]}
              >
                <PullingIndicator />
              </Animated.View>
              {children}
            </>
          )}
        </>
      </Animated.View>
    </GestureDetector>
  );
};

export const RefreshControl =
  Platform.OS === 'web' ? RefreshControlWeb : RefreshControlRN;
