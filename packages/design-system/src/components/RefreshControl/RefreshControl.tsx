import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ColorValue,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
            // position: 'absolute',
            // top: 0,
            // left: 0,
            // right: 0,
          }
        : {}) as ViewStyle),
      flex: 1,
      width: '100%',
    },
    content: {
      // flex: 1,
    },
    pullingContainer: {
      position: 'absolute',
      top: -maxTranslateY,
      left: 0,
      right: 0,
      zIndex: 99,
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
      zIndex: 99,
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
  progress: number;
}

interface RefreshingIndicatorProps {
  color?: ColorValue;
  size?: number;
}

const DefaultPullingIndicator = ({
  color,
  size = defaultIndicatorSize,
  progress,
}: PullingIndicatorProps) => {
  const rotation = progress * 180;
  return (
    <Animated.View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Feather name="arrow-down" size={size} color={color as string} />
    </Animated.View>
  );
};

const DefaultRefreshingIndicator = ({
  color,
  size,
}: RefreshingIndicatorProps) => {
  return <ActivityIndicator color={color as string} size={size} />;
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
  const isScrolling = useSharedValue(false); // To track if we are in scrolling mode
  const scrollPosition = useSharedValue(0);
  const initialTranslationY = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

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

  const gesture = Gesture.Pan()
    .onStart((e) => {
      // if (scrollPosition.value <= 0) {
      //   runOnJS(notifyPullState)(true);
      // }
      // Reset states
      isPulling.value = false;
      isScrolling.value = false;
      initialTranslationY.value = e.translationY; // Capture initial translationY
      console.log('initialTranslationY', initialTranslationY.value);
    })
    .onChange((e) => {
      if (!enabled) return;

      if (!isPulling.value && !isScrolling.value && e.changeY !== 0) {
        console.log('scrollPosition', scrollPosition.value);
        console.log('e.translationY', e.translationY);
        console.log('initialTranslationY', initialTranslationY.value);
        console.log('translateY', translateY.value);
        const downward = e.changeY > 0;
        console.log('downward', downward);
        console.log(`e`, e);
        // Determine if it's a pull or a scroll
        if (
          initialTranslationY.value === 0 &&
          scrollPosition.value <= 0 &&
          downward
        ) {
          // Pull-to-refresh
          isPulling.value = true;
          runOnJS(notifyPullState)(true);
        } else {
          // Normal scroll
          isScrolling.value = true;
        }
        console.log('isPulling', isPulling.value);
        console.log('isScrolling', isScrolling.value);
      }

      if (isPulling.value) {
        // Handle pull-to-refresh gesture
        const newTranslateY = Math.max(
          0,
          Math.min(translateY.value + e.changeY, maxTranslateY)
        );
        animateValues(newTranslateY);
      }
    })
    .onEnd(() => {
      if (isPulling.value) {
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
      }

      // Reset pulling and scrolling state
      isPulling.value = false;
      isScrolling.value = false;
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const cursorAnimatedStyles = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ translateY: cursorPositionY.value }],
  }));

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollPosition.value = event.nativeEvent.contentOffset.y;
    },
    [scrollPosition]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyles]}>
        <Animated.View style={[styles.pullingContainer]}>
          {refreshing ? (
            <RefreshingIndicator color={theme.colors.primary} size={size} />
          ) : (
            <PullingIndicator
              color={theme.colors.primary}
              size={size}
              progress={translateY.value / maxTranslateY}
            />
          )}
        </Animated.View>
        <Animated.View style={[styles.cursor, cursorAnimatedStyles]}>
          <Loader color={theme.colors.primary} size={size} />
        </Animated.View>
        <Animated.ScrollView
          style={styles.content}
          ref={scrollViewRef}
          onScroll={handleScroll}
        >
          {children}
        </Animated.ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};
