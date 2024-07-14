// packages/design-system/src/components/refresh-control/refresh-control.tsx
import { Feather } from '@expo/vector-icons';
import { useLogger } from '@siteed/react-native-logger';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ColorValue,
  Platform,
  RefreshControlProps as RefreshControlPropsRN,
  RefreshControl as RefreshControlRN,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator } from 'react-native-paper';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppTheme } from '../../hooks/use-app-theme-setup';
import { useTheme } from '../../providers/theme-provider';
import { Loader } from './loader';

const getStyles = ({
  progressBackgroundColor,
}: {
  theme: AppTheme;
  progressBackgroundColor?: ColorValue;
}) => {
  return StyleSheet.create({
    container: {
      ...((Platform.OS === 'web'
        ? { overflow: 'auto', height: '100%' }
        : {}) as ViewStyle),
    },
    pullingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: progressBackgroundColor,
    },
  });
};

export interface RefreshControlProps extends RefreshControlPropsRN {
  PullingIndicator?: () => React.ReactNode;
  RefreshingIndicator?: () => React.ReactNode;
}

const maxTranslateY = 50;
const defaultProgressViewOffset = -20;
const defaultIndicatorSize = 24;

interface PullingIndicatorProps {
  color?: string;
  size?: number;
}
const DefaultPullingIndicator = ({
  color,
  size = defaultIndicatorSize,
}: PullingIndicatorProps) => {
  return <Feather name="arrow-down" size={size} color={color} />;
};

const DefaultRefreshingIndicator = () => {
  return <ActivityIndicator />;
};

export const RefreshControl: React.FC<RefreshControlProps> = ({
  refreshing,
  enabled = true,
  progressBackgroundColor,
  progressViewOffset = defaultProgressViewOffset,
  size = defaultIndicatorSize, // size of the indicator
  onRefresh,
  PullingIndicator = DefaultPullingIndicator,
  RefreshingIndicator = DefaultRefreshingIndicator,
  children,
}) => {
  const initialTranslateY = useRef(0);
  const translateY = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const cursorPositionY = useSharedValue(0);
  const theme = useTheme();
  const styles = useMemo(
    () => getStyles({ theme, progressBackgroundColor }),
    [theme, progressBackgroundColor]
  );
  const { logger } = useLogger('RefreshControl');

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
      if (!enabled) return;

      let newTranslateY = translateY.value + e.changeY;
      // const distance = newTranslateY - initialTranslateY.current;
      if (newTranslateY < 0) {
        newTranslateY = 0;
      } else if (newTranslateY >= maxTranslateY) {
        newTranslateY = maxTranslateY;
      }

      cursorPositionY.value = Math.min(10, newTranslateY);
      cursorOpacity.value = 0.5 + (newTranslateY / maxTranslateY) * 0.5;

      // runOnJS(logger.debug)(
      //   'drag',
      //   `distance: ${distance}, newTranslateY: ${newTranslateY} ==> translateY: ${translateY.value}`
      // );
      translateY.value = newTranslateY;
    })
    .onEnd(() => {
      cursorOpacity.value = 0;
      cursorPositionY.value = progressViewOffset;

      runOnJS(logger.log)('end drag', translateY.value);
      if (translateY.value > progressViewOffset) {
        translateY.value = withSpring(0);
        if (onRefresh) {
          runOnJS(onRefresh)();
        }
      }
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const cursorAnimatedStyles = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ translateY: cursorPositionY.value }],
  }));

  if (Platform.OS === 'ios') {
    return <RefreshControlRN refreshing={refreshing} onRefresh={onRefresh} />;
  }

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.container, animatedStyles]}>
        <>
          {refreshing ? (
            <RefreshingIndicator />
          ) : (
            <View>
              <Animated.View
                style={[styles.pullingContainer, cursorAnimatedStyles]}
              >
                <PullingIndicator color={theme.colors.primary} size={size} />
                <Loader />
              </Animated.View>
              {children ? <View>{children}</View> : null}
            </View>
          )}
        </>
      </Animated.View>
    </GestureDetector>
  );
};
