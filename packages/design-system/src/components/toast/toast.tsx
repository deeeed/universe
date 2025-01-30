import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

import type {
  CursorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Snackbar, Text } from 'react-native-paper';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top' | 'bottom' | 'middle';

export interface ToastTypeStyles {
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
}

export interface ToastProps {
  /** The message to show */
  message: string;
  subMessage?: string;
  /** Type of toast */
  type?: ToastType;
  /**  Position of the toast */
  position?: ToastPosition;
  /** Toast duration */
  duration?: number;
  loading?: boolean;
  /** Toast Visibility */
  visibility?: boolean;
  /** Toast Icon visibility */
  iconVisible?: boolean;
  /** Toast Action onPress */
  action?: () => void;
  /** Toast Action Label */
  actionLabel?: string;
  /** Toast Message Style */
  messageStyle?: StyleProp<ViewStyle>;
  subMessageStyle?: StyleProp<TextStyle>;
  /** icon style */
  iconStyle?: StyleProp<TextStyle>;
  /** Toast Message Container Style */
  messageContainerStyle?: StyleProp<ViewStyle>;
  /** Toast Snackbar Style */
  snackbarStyle?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
  themeOverrides?: {
    background?: string;
    text?: string;
    typeStyles?: {
      [key in ToastType]?: ToastTypeStyles;
    };
  };
  swipeConfig?: {
    isEnabled?: boolean;
    direction?: 'left-to-right' | 'right-to-left' | 'both';
    initialThreshold?: number;
    dismissThreshold?: number;
    velocityThreshold?: number;
    animationDuration?: number;
    dismissDistance?: number;
  };
  showCloseIcon?: boolean;
  closeIconStyle?: StyleProp<TextStyle>;
}

export type ToastIconType = {
  [key in ToastType]: keyof (typeof MaterialCommunityIcons)['glyphMap'];
};

export type ToastStyles<P> = {
  [key in ToastType]: StyleProp<P>;
};

const icons: ToastIconType = {
  info: 'information-outline',
  warning: 'alert-circle-outline',
  success: 'check-circle-outline',
  error: 'close-circle-outline',
};

export const Toast = ({
  position = 'bottom',
  actionLabel = 'DONE',
  duration = 2000,
  visibility = false,
  iconVisible = true,
  loading = false,
  message,
  subMessage,
  action,
  messageStyle,
  subMessageStyle,
  iconStyle,
  closeIconStyle,
  messageContainerStyle,
  snackbarStyle,
  type = 'info',
  onDismiss,
  swipeConfig = {
    isEnabled: true,
    direction: 'right-to-left',
    initialThreshold: 15,
    dismissThreshold: 40,
    velocityThreshold: 500,
    animationDuration: 200,
    dismissDistance: Math.min(Dimensions.get('window').width, 400),
  },
  showCloseIcon = false,
}: ToastProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme, type }), [theme, type]);
  const windowDimensions = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  // Reset animation when visibility changes
  React.useEffect(() => {
    if (visibility) {
      translateX.value = 0;
    }
  }, [visibility]);

  const computedStyle = useMemo(() => {
    const base = {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: insets.left,
      right: insets.right,
      width: undefined,
      alignItems: 'center',
      zIndex: 9999,
    };

    const marginBottom = (snackbarStyle as ViewStyle)?.marginBottom || 0;

    let style;
    if (position === 'bottom') {
      style = {
        ...base,
        bottom: insets.bottom + Number(marginBottom),
      };
      return style;
    }
    if (position === 'top') {
      style = {
        ...base,
        top: insets.top,
        bottom: undefined,
      };
      return style;
    }
    style = {
      ...base,
      top: insets.top,
      bottom: insets.bottom,
      justifyContent: 'center',
    };
    if (Platform.OS === 'web') {
      style = {
        ...styles,
        top: windowDimensions.height / 2 - 20,
        bottom: windowDimensions.height / 2 - 20,
      };
    }
    return style;
  }, [insets, position, windowDimensions, snackbarStyle]);

  const handleDismiss = () => {
    onDismiss?.();
  };

  const dismissToast = () => {
    handleDismiss();
  };

  const [isDragging, setIsDragging] = React.useState(false);
  const startX = React.useRef(0);
  const viewRef = React.useRef(null);

  const webHandlers =
    Platform.OS === 'web'
      ? {
          onMouseDown: (e: React.MouseEvent) => {
            if (
              Math.abs(e.clientX - startX.current) >
              swipeConfig.initialThreshold!
            ) {
              setIsDragging(true);
              startX.current = e.clientX;
            }
          },
          onMouseMove: (e: React.MouseEvent) => {
            if (!isDragging) return;
            const delta = e.clientX - startX.current;
            if (swipeConfig.direction === 'right-to-left' && delta > 0) return;
            if (swipeConfig.direction === 'left-to-right' && delta < 0) return;
            translateX.value = delta;
          },
          onMouseUp: (e: React.MouseEvent) => {
            if (!isDragging) return;
            setIsDragging(false);
            const delta = e.clientX - startX.current;
            const velocity = Math.abs(delta) / 100; // Simple velocity calculation
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
                () => {
                  runOnJS(dismissToast)();
                }
              );
            } else {
              translateX.value = withTiming(0, { duration: 150 });
            }
          },
        }
      : {};

  const gesture =
    Platform.OS !== 'web'
      ? Gesture.Pan()
          .enabled(swipeConfig.isEnabled ?? true)
          .onStart(() => {
            context.value = { x: translateX.value };
          })
          .onUpdate((event) => {
            if (Math.abs(event.translationX) < swipeConfig.initialThreshold!)
              return;
            if (
              swipeConfig.direction === 'right-to-left' &&
              event.translationX > 0
            )
              return;
            if (
              swipeConfig.direction === 'left-to-right' &&
              event.translationX < 0
            )
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
                () => {
                  runOnJS(dismissToast)();
                }
              );
            } else {
              translateX.value = withSpring(0);
            }
          })
      : null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    cursor: Platform.OS === 'web' ? ('grab' as CursorValue) : undefined,
    touchAction: Platform.OS === 'web' ? 'pan-x' : undefined,
  }));

  if (!visibility) return null;

  return (
    <View style={computedStyle as StyleProp<ViewStyle>}>
      {Platform.OS === 'web' ? (
        <Animated.View
          ref={viewRef}
          {...webHandlers}
          style={[
            {
              width: '100%',
              alignItems: 'center',
            },
            animatedStyle,
          ]}
        >
          <Snackbar
            onDismiss={handleDismiss}
            style={[
              styles.snackBarStyle,
              snackbarStyle,
              position === 'bottom' && {
                marginBottom: (snackbarStyle as ViewStyle)?.marginBottom || 0,
              },
            ]}
            wrapperStyle={
              { width: '100%', alignItems: 'center' } as StyleProp<ViewStyle>
            }
            duration={duration}
            visible={visibility}
            action={
              action
                ? {
                    label: actionLabel,
                    style: styles.actionButton,
                    labelStyle: styles.actionButtonText,
                    onPress: action,
                  }
                : undefined
            }
          >
            <View
              style={[styles.defaultMessageContainer, messageContainerStyle]}
            >
              {loading && <ActivityIndicator />}
              {!loading && iconVisible && (
                <MaterialCommunityIcons
                  name={icons[type]}
                  style={[styles.iconStyle, iconStyle]}
                  size={20}
                />
              )}
              <View style={styles.textContainer}>
                <Text style={[styles.message, messageStyle]}>{message}</Text>
                {subMessage && (
                  <Text style={[styles.subMessage, subMessageStyle]}>
                    {subMessage}
                  </Text>
                )}
              </View>
              {showCloseIcon && (
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  style={[styles.closeIcon, closeIconStyle]}
                  onPress={dismissToast}
                />
              )}
            </View>
          </Snackbar>
        </Animated.View>
      ) : gesture ? (
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                width: '100%',
                alignItems: 'center',
              },
              animatedStyle,
            ]}
          >
            <Snackbar
              onDismiss={handleDismiss}
              style={[
                styles.snackBarStyle,
                snackbarStyle,
                position === 'bottom' && {
                  marginBottom: (snackbarStyle as ViewStyle)?.marginBottom || 0,
                },
              ]}
              wrapperStyle={
                { width: '100%', alignItems: 'center' } as StyleProp<ViewStyle>
              }
              duration={duration}
              visible={visibility}
              action={
                action
                  ? {
                      label: actionLabel,
                      style: styles.actionButton,
                      labelStyle: styles.actionButtonText,
                      onPress: action,
                    }
                  : undefined
              }
            >
              <View
                style={[styles.defaultMessageContainer, messageContainerStyle]}
              >
                {loading && <ActivityIndicator />}
                {!loading && iconVisible && (
                  <MaterialCommunityIcons
                    name={icons[type]}
                    style={[styles.iconStyle, iconStyle]}
                    size={20}
                  />
                )}
                <View style={styles.textContainer}>
                  <Text style={[styles.message, messageStyle]}>{message}</Text>
                  {subMessage && (
                    <Text style={[styles.subMessage, subMessageStyle]}>
                      {subMessage}
                    </Text>
                  )}
                </View>
                {showCloseIcon && (
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    style={[styles.closeIcon, closeIconStyle]}
                    onPress={dismissToast}
                  />
                )}
              </View>
            </Snackbar>
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
};

const getStyles = ({ theme, type }: { theme: AppTheme; type: ToastType }) => {
  const typeStyle = theme.toast?.typeStyles?.[type];

  // Define base colors
  const baseColors = {
    background:
      theme.toast?.background ||
      (theme.dark ? theme.colors.surfaceVariant : theme.colors.surface),
    text:
      theme.toast?.text ||
      (theme.dark ? theme.colors.onSurfaceVariant : theme.colors.onSurface),
    loading: theme.colors.primary,
  };

  return StyleSheet.create({
    snackBarStyle: {
      borderRadius: 3,
      width: '95%',
      maxWidth: 400,
      backgroundColor: typeStyle?.backgroundColor || baseColors.background,
      padding: theme.padding.s,
      position: 'relative',
      alignSelf: 'center',
      ...(Platform.OS === 'web' && {
        cursor: 'grab' as CursorValue,
        touchAction: 'pan-x',
      }),
    },
    message: {
      fontSize: 14,
      color: typeStyle?.textColor || baseColors.text,
    },
    textContainer: {
      gap: 5,
      paddingLeft: 10,
    },
    subMessage: {
      fontWeight: 'normal',
      fontSize: 12,
    },
    defaultMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    iconStyle: {
      color: typeStyle?.iconColor || theme.colors[type],
    },
    actionButton: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 4,
      marginLeft: theme.padding.s,
    },
    actionButtonText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: '600',
      fontSize: 14,
    },
    closeIcon: {
      marginLeft: 'auto',
      color: theme.colors.onSurface,
      padding: 4,
    },
  });
};

// Add this type to your AppTheme interface (in the appropriate types file)
declare module '../../hooks/_useAppThemeSetup' {
  interface AppTheme {
    toast?: {
      background?: string;
      text?: string;
      typeStyles?: {
        [key in ToastType]?: ToastTypeStyles;
      };
    };
  }
}
