// packages/design-system/src/components/refresh-control/refresh-control.tsx
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { baseLogger } from '../../utils/logger';
import { Loader } from './Loader';

const logger = baseLogger.extend('RefreshControl');

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
      flex: 1,
      width: '100%',
    },
    pullingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: progressBackgroundColor,
      height: maxTranslateY,
      overflow: 'hidden',
    },
  });
};

export interface RefreshControlProps extends RefreshControlPropsRN {
  PullingIndicator?: () => React.ReactNode;
  RefreshingIndicator?: () => React.ReactNode;
  onPullStateChange?: (isPulling: boolean) => void;
  pullResetDelay?: number;
}

const maxTranslateY = 50;
const defaultProgressViewOffset = -maxTranslateY / 2;
const defaultIndicatorSize = 24;
const DEFAULT_PULL_RESET_DELAY = 300; // 300ms default delay

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PullingIndicator = DefaultPullingIndicator,
  RefreshingIndicator = DefaultRefreshingIndicator,
  onPullStateChange,
  pullResetDelay = DEFAULT_PULL_RESET_DELAY,
  ...rcProps
}) => {
  if (Platform.OS !== 'web') {
    return <RefreshControlRN {...rcProps} />;
  }

  const {
    refreshing,
    enabled = true,
    progressBackgroundColor,
    progressViewOffset = -defaultProgressViewOffset,
    size = defaultIndicatorSize, // size of the indicator
    onRefresh,
    children,
  } = rcProps;
  const initialTranslateY = useRef(0);
  const translateY = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const cursorPositionY = useSharedValue(0);
  const theme = useTheme();
  const styles = useMemo(
    () => getStyles({ theme, progressBackgroundColor }),
    [theme, progressBackgroundColor]
  );
  const isPulling = useSharedValue(false);

  useEffect(() => {
    if (!refreshing) {
      translateY.value = withTiming(0, { duration: 180 });
    }
  }, [refreshing]);

  const notifyPullState = useCallback(
    (pulling: boolean) => {
      isPulling.value = pulling;
      onPullStateChange?.(pulling);
    },
    [onPullStateChange, isPulling]
  );

  const tap = Gesture.Pan()
    .onStart((_e) => {
      initialTranslateY.current = translateY.value;
      runOnJS(notifyPullState)(true);
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
      setTimeout(() => {
        runOnJS(notifyPullState)(false);
      }, pullResetDelay);

      runOnJS(logger.debug)(
        `end drag translateY.value=${translateY.value} progressViewOffset=${progressViewOffset} `,
        translateY.value
      );
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
                {}
                {/* <PullingIndicator color={theme.colors.primary} size={size} /> */}
                <Loader color={theme.colors.primary} size={size} />
              </Animated.View>
              {children}
            </View>
          )}
        </>
      </Animated.View>
    </GestureDetector>
  );
};
