import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ColorValue,
  Platform,
  RefreshControlProps as RefreshControlPropsRN,
  RefreshControl as RefreshControlRN,
  StyleSheet,
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
import { Loader } from './Loader';

const getStyles = ({
  progressBackgroundColor,
}: {
  theme: AppTheme;
  progressBackgroundColor?: ColorValue;
}) => {
  return StyleSheet.create({
    container: {
      ...((Platform.OS === 'web'
        ? {
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }
        : {}) as ViewStyle),
      flex: 1,
      width: '100%',
    },
    content: {
      flex: 1,
    },
    pullingContainer: {
      position: 'absolute',
      top: -maxTranslateY,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: progressBackgroundColor,
      height: maxTranslateY,
      overflow: 'hidden',
    },
    cursor: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      alignItems: 'center',
      justifyContent: 'center',
      height: maxTranslateY,
      zIndex: 1,
    },
  });
};

export interface RefreshControlProps extends RefreshControlPropsRN {
  PullingIndicator?: React.FC<PullingIndicatorProps>;
  RefreshingIndicator?: React.FC<RefreshingIndicatorProps>;
  onPullStateChange?: (isPulling: boolean) => void;
  pullResetDelay?: number;
}

const maxTranslateY = 50;
const defaultProgressViewOffset = -maxTranslateY / 2;
const defaultIndicatorSize = 24;
const DEFAULT_PULL_RESET_DELAY = 300; // 300ms default delay

interface PullingIndicatorProps {
  color?: ColorValue;
  size?: number;
}

interface RefreshingIndicatorProps {
  color?: ColorValue;
  size?: number;
}

const DefaultPullingIndicator = ({
  color,
  size = defaultIndicatorSize,
}: PullingIndicatorProps) => {
  return <Feather name="arrow-down" size={size} color={color as string} />;
};

const DefaultRefreshingIndicator = () => {
  return <ActivityIndicator />;
};

export const RefreshControl: React.FC<RefreshControlProps> = ({
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
    size = defaultIndicatorSize,
    onRefresh,
    children,
  } = rcProps;
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

  const animateValues = (newTranslateY: number) => {
    'worklet';
    translateY.value = newTranslateY;
    cursorPositionY.value = Math.min(10, newTranslateY);
    cursorOpacity.value = 0.5 + (newTranslateY / maxTranslateY) * 0.5;
  };

  const tap = Gesture.Pan()
    .onStart((_e) => {
      runOnJS(notifyPullState)(true);
    })
    .onChange((e) => {
      if (!enabled) return;
      const newTranslateY = Math.max(
        0,
        Math.min(translateY.value + e.changeY, maxTranslateY)
      );
      animateValues(newTranslateY);
    })
    .onEnd(() => {
      cursorOpacity.value = withTiming(0);
      cursorPositionY.value = withTiming(progressViewOffset);
      setTimeout(() => {
        runOnJS(notifyPullState)(false);
      }, pullResetDelay);

      if (translateY.value > progressViewOffset) {
        if (onRefresh) {
          runOnJS(onRefresh)();
        }
      }
      translateY.value = withSpring(0);
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
        <Animated.View style={[styles.pullingContainer]}>
          {refreshing ? (
            <RefreshingIndicator />
          ) : (
            <PullingIndicator color={theme.colors.primary} size={size} />
          )}
        </Animated.View>
        <Animated.View style={[styles.cursor, cursorAnimatedStyles]}>
          <Loader color={theme.colors.primary} size={size} />
        </Animated.View>
        <Animated.View style={styles.content}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};
