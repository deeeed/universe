import { Feather } from '@expo/vector-icons';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator } from 'react-native-paper';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import {
  CONSTANTS,
  PullingIndicatorProps,
  RefreshControlProps,
  RefreshingIndicatorProps,
  StylesProps,
} from './RefreshControl.types';

const getStyles = ({ progressBackgroundColor }: StylesProps) => {
  return StyleSheet.create({
    container: {
      overflow: 'visible',
      flex: 1,
      width: '100%',
      position: 'relative',
    },
    content: {
      // flex: 1,
    },
    indicatorContainer: {
      position: 'absolute',
      top: -CONSTANTS.maxTranslateY, // Start offscreen
      left: 0,
      right: 0,
      zIndex: 1000, // Ensure it's above everything else
      alignItems: 'center',
      justifyContent: 'center',
      height: CONSTANTS.maxTranslateY,
      backgroundColor: progressBackgroundColor,
      pointerEvents: 'none',
    },
    cursor: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      alignItems: 'center',
      justifyContent: 'center',
      height: CONSTANTS.maxTranslateY,
      zIndex: 99,
      pointerEvents: 'none',
    },
  });
};

const DefaultPullingIndicator = ({
  color,
  size = CONSTANTS.defaultIndicatorSize,
  progress,
}: PullingIndicatorProps) => {
  const scale = 1 + progress * 0.2;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
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

export const RefreshControl = React.forwardRef<unknown, RefreshControlProps>(
  (
    {
      PullingIndicator = DefaultPullingIndicator,
      RefreshingIndicator = DefaultRefreshingIndicator,
      onPullStateChange,
      pullResetDelay = CONSTANTS.DEFAULT_PULL_RESET_DELAY,
      testID,
      debug = false,
      ...rcProps
    },
    _ref
  ) => {
    const {
      refreshing,
      enabled = true,
      progressBackgroundColor,
      progressViewOffset: _progressViewOffset = CONSTANTS.refreshThreshold,
      size = CONSTANTS.defaultIndicatorSize,
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
    const isScrolling = useSharedValue(false);
    const scrollPosition = useSharedValue(0);
    const initialTranslationY = useSharedValue(0);
    const hasDragged = useSharedValue(false);
    const isRefreshing = useSharedValue(false);

    // Use refs instead of state to avoid re-renders
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const refreshStartTimeRef = useRef<number | null>(null);
    const lastPullPositionRef = useRef(0);

    // Add shared UI state
    const [shouldShowIndicator, setShouldShowIndicator] = useState(false);
    const [isCurrentlyRefreshing, setIsCurrentlyRefreshing] = useState(false);

    const debugLog = useCallback(
      (message: string, ...args: unknown[]) => {
        if (debug) {
          console.log(`[RefreshControl] ${message}`, ...args);
        }
      },
      [debug]
    );

    // Update both the shared value and the React state for refreshing
    useEffect(() => {
      debugLog('Refreshing prop changed:', refreshing);
      isRefreshing.value = refreshing;
      setIsCurrentlyRefreshing(refreshing);

      if (refreshing) {
        // Clear any existing timeout to prevent issues
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }

        // Start refreshing
        refreshStartTimeRef.current = Date.now();

        // If translateY is at 0, we need to show the indicator at a visible position
        if (translateY.value < CONSTANTS.minVisiblePosition) {
          translateY.value = withSpring(CONSTANTS.minVisiblePosition);
          debugLog(
            'Moving indicator to visible position:',
            CONSTANTS.minVisiblePosition
          );
        } else {
          // Keep it at the current pull position
          debugLog('Keeping indicator at current position:', translateY.value);
        }
      } else if (refreshStartTimeRef.current) {
        // Calculate how long we've been refreshing
        const elapsedTime = Date.now() - refreshStartTimeRef.current;
        const remainingTime = Math.max(
          0,
          CONSTANTS.MIN_REFRESHING_DURATION - elapsedTime
        );

        debugLog(
          'Refresh ended, elapsed time:',
          elapsedTime,
          'remaining:',
          remainingTime
        );

        if (remainingTime > 0) {
          // Keep showing for minimum duration
          refreshTimeoutRef.current = setTimeout(() => {
            debugLog('Minimum refresh time reached, hiding indicator');
            isRefreshing.value = false;
            translateY.value = withTiming(0, { duration: 180 });
            refreshStartTimeRef.current = null;
            refreshTimeoutRef.current = null;
          }, remainingTime);
        } else {
          // Hide immediately if we've shown it long enough
          isRefreshing.value = false;
          translateY.value = withTiming(0, { duration: 180 });
          refreshStartTimeRef.current = null;
        }
      }
    }, [refreshing, debugLog]);

    // Clean up timeout on unmount
    useEffect(() => {
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }, []);

    const notifyPullState = useCallback(
      (pulling: boolean) => {
        debugLog('Pull state changed:', pulling);
        onPullStateChange?.(pulling);
      },
      [onPullStateChange, debugLog]
    );

    const animateValues = (newTranslateY: number) => {
      'worklet';

      // Only animate if we're not already refreshing
      if (!isRefreshing.value) {
        translateY.value = newTranslateY;
        cursorPositionY.value = Math.min(10, newTranslateY);
        cursorOpacity.value =
          0.5 + (newTranslateY / CONSTANTS.maxTranslateY) * 0.5;
      }
    };

    const triggerRefresh = useCallback(() => {
      if (onRefresh) {
        debugLog('Calling onRefresh()');

        // Store the current position for future reference
        lastPullPositionRef.current = translateY.value;

        // Set refreshing state
        isRefreshing.value = true;

        // Call the refresh handler
        onRefresh();
      }
    }, [onRefresh, debugLog]);

    const gesture = Gesture.Pan()
      .onStart((e) => {
        debugLog('Gesture started');
        if (!isRefreshing.value) {
          isPulling.value = false;
          isScrolling.value = false;
          initialTranslationY.value = e.translationY;
        }
      })
      .onChange((e) => {
        if (!enabled || isRefreshing.value) {
          debugLog('Gesture ignored: already refreshing or disabled');
          return;
        }

        if (
          !hasDragged.value &&
          !isPulling.value &&
          !isScrolling.value &&
          e.changeY !== 0
        ) {
          const downward = e.changeY > 0;
          debugLog('Determining gesture type', {
            scrollPos: scrollPosition.value,
            isDownward: downward,
          });

          // Determine if it's a pull or a scroll
          if (scrollPosition.value <= 0 && downward) {
            // Pull-to-refresh
            isPulling.value = true;
            isScrolling.value = false;
            debugLog('Started PULLING');
          } else {
            // Normal scroll
            isScrolling.value = true;
            isPulling.value = false;
            debugLog('Started SCROLLING');
          }
          runOnJS(notifyPullState)(true);
          hasDragged.value = true;
        }

        if (isPulling.value) {
          // Handle pull-to-refresh gesture
          const newTranslateY = Math.max(
            0,
            Math.min(translateY.value + e.changeY, CONSTANTS.maxTranslateY)
          );
          debugLog(
            'Pulling:',
            Math.round(newTranslateY),
            '/',
            CONSTANTS.maxTranslateY
          );
          animateValues(newTranslateY);
        }
      })
      .onEnd(() => {
        debugLog('Gesture ended', {
          translateY: Math.round(translateY.value),
          threshold: CONSTANTS.refreshThreshold,
          willRefresh: translateY.value >= CONSTANTS.refreshThreshold,
        });

        hasDragged.value = false;
        if (isPulling.value) {
          cursorOpacity.value = withTiming(0);

          // Check if pull distance is sufficient to trigger refresh
          if (translateY.value >= CONSTANTS.refreshThreshold) {
            debugLog('Threshold reached, triggering refresh');
            // Important: We do NOT reset translateY here to maintain visual position
            // Store the current position
            runOnJS(triggerRefresh)();
          } else {
            debugLog('Pull not enough, resetting');
            // Only reset if not refreshing
            translateY.value = withSpring(0);
          }
        }

        setTimeout(() => {
          runOnJS(notifyPullState)(false);
        }, pullResetDelay);

        // Reset pulling and scrolling state
        isPulling.value = false;
        isScrolling.value = false;
      });

    // Create a single animated style for the indicator container
    const indicatorContainerStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: translateY.value }],
      };
    });

    const cursorAnimatedStyle = useAnimatedStyle(() => ({
      opacity: cursorOpacity.value,
      transform: [{ translateY: cursorPositionY.value }],
    }));

    // Fix the visibility tracking with a more reliable approach
    useAnimatedReaction(
      () => {
        // Only show indicator when actively pulling with some distance OR when refreshing
        return {
          // Must be actively pulling AND have moved some distance
          isPulling: isPulling.value && translateY.value > 5,
          isRefreshing: isRefreshing.value,
        };
      },
      (result) => {
        // Only show when either condition is true
        const shouldShow = result.isPulling || result.isRefreshing;
        runOnJS(setShouldShowIndicator)(shouldShow);
      },
      [
        // Empty dependency array is fine here
      ]
    );

    return (
      <View style={styles.container} testID={testID}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.content}>
            {children}

            {/* Only render when actively pulling or refreshing */}
            {shouldShowIndicator && (
              <Animated.View
                style={[styles.indicatorContainer, indicatorContainerStyle]}
                testID={`${testID}-indicator-container`}
              >
                {isCurrentlyRefreshing ? (
                  <RefreshingIndicator
                    color={rcProps.tintColor || theme.colors.primary}
                    size={size}
                  />
                ) : (
                  <PullingIndicator
                    color={rcProps.tintColor || theme.colors.primary}
                    size={size}
                    progress={translateY.value / CONSTANTS.maxTranslateY}
                  />
                )}
              </Animated.View>
            )}

            <Animated.View
              style={[styles.cursor, cursorAnimatedStyle]}
              testID={`${testID}-cursor`}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

RefreshControl.displayName = 'RefreshControl';
