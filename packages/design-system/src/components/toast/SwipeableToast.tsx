import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorValue, ViewStyle } from 'react-native';
import { Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Toast } from './Toast';
import type { SwipeableToastProps, SwipeConfig } from './Toast.types';

const DEFAULT_SWIPE_CONFIG: SwipeConfig = {
  isEnabled: true,
  direction: 'right-to-left',
  initialThreshold: 15,
  dismissThreshold: 40,
  velocityThreshold: 500,
  animationDuration: 200,
  dismissDistance: Math.min(Dimensions.get('window').width, 400),
};

const baseContainerStyle: ViewStyle = {
  width: '100%',
  alignItems: 'center',
};

export function SwipeableToast({
  swipeConfig: userSwipeConfig = {},
  ...toastProps
}: SwipeableToastProps) {
  const swipeConfig = {
    ...DEFAULT_SWIPE_CONFIG,
    ...userSwipeConfig,
  };

  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(toastProps.visibility);
  const startX = useRef(0);

  useEffect(() => {
    if (toastProps.visibility) {
      translateX.value = 0;
      setIsVisible(true);
    } else {
      translateX.value = withTiming(0, { duration: 0 }, () => {
        runOnJS(setIsVisible)(false);
      });
    }

    return () => {
      translateX.value = 0;
    };
  }, [toastProps.visibility, translateX]);

  const handleDismiss = useCallback(() => {
    translateX.value = withTiming(
      swipeConfig.direction === 'right-to-left'
        ? -swipeConfig.dismissDistance!
        : swipeConfig.dismissDistance!,
      {
        duration: swipeConfig.animationDuration,
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsVisible)(false);
          if (toastProps.onDismiss) {
            runOnJS(toastProps.onDismiss)();
          }
        }
      }
    );
  }, [toastProps.onDismiss, translateX, swipeConfig]);

  const webHandlers =
    Platform.OS === 'web'
      ? {
          onMouseDown: (e: React.MouseEvent) => {
            startX.current = e.clientX;
            setIsDragging(true);
          },
          onMouseMove: (e: React.MouseEvent) => {
            if (!isDragging) return;
            const delta = e.clientX - startX.current;

            if (Math.abs(delta) < swipeConfig.initialThreshold!) return;
            if (swipeConfig.direction === 'right-to-left' && delta > 0) return;
            if (swipeConfig.direction === 'left-to-right' && delta < 0) return;

            translateX.value = delta;
          },
          onMouseUp: (e: React.MouseEvent) => {
            if (!isDragging) return;
            setIsDragging(false);

            const delta = e.clientX - startX.current;
            const velocity = Math.abs(delta / 0.2);
            const shouldDismiss =
              Math.abs(delta) > swipeConfig.dismissThreshold! ||
              velocity > swipeConfig.velocityThreshold!;

            if (shouldDismiss) {
              const direction =
                delta > 0
                  ? swipeConfig.dismissDistance!
                  : -swipeConfig.dismissDistance!;
              translateX.value = withTiming(
                direction,
                { duration: swipeConfig.animationDuration },
                (finished) => {
                  if (finished) {
                    runOnJS(setIsVisible)(false);
                    if (toastProps.onDismiss) {
                      runOnJS(toastProps.onDismiss)();
                    }
                  }
                }
              );
            } else {
              translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 200,
              });
            }
          },
          onMouseLeave: () => {
            if (isDragging) {
              setIsDragging(false);
              translateX.value = withSpring(0, {
                damping: 20,
                stiffness: 200,
              });
            }
          },
        }
      : {};

  const panGesture = Gesture.Pan()
    .enabled(swipeConfig.isEnabled ?? true)
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) < swipeConfig.initialThreshold!) return;
      if (swipeConfig.direction === 'right-to-left' && event.translationX > 0)
        return;
      if (swipeConfig.direction === 'left-to-right' && event.translationX < 0)
        return;

      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      const shouldDismiss =
        Math.abs(translateX.value) > swipeConfig.dismissThreshold! ||
        Math.abs(event.velocityX) > swipeConfig.velocityThreshold!;

      if (shouldDismiss) {
        const direction =
          translateX.value > 0
            ? swipeConfig.dismissDistance!
            : -swipeConfig.dismissDistance!;
        translateX.value = withTiming(
          direction,
          { duration: swipeConfig.animationDuration },
          (finished) => {
            if (finished) {
              runOnJS(setIsVisible)(false);
              if (toastProps.onDismiss) {
                runOnJS(toastProps.onDismiss)();
              }
            }
          }
        );
      } else {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    cursor: Platform.OS === 'web' ? ('grab' as CursorValue) : undefined,
    touchAction: Platform.OS === 'web' ? 'pan-x' : undefined,
  }));

  if (!isVisible) return null;

  if (Platform.OS === 'web') {
    return (
      <Animated.View
        {...webHandlers}
        style={[baseContainerStyle, animatedStyle]}
      >
        <Toast
          {...toastProps}
          visibility={isVisible}
          onDismiss={handleDismiss}
        />
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[baseContainerStyle, animatedStyle]}>
        <Toast
          {...toastProps}
          visibility={isVisible}
          onDismiss={handleDismiss}
        />
      </Animated.View>
    </GestureDetector>
  );
}
