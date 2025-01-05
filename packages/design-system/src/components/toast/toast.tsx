import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Snackbar, Text } from 'react-native-paper';
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

const getStyles = ({
  theme,
  type,
  themeOverrides,
}: {
  theme: AppTheme;
  type: ToastType;
  themeOverrides?: ToastProps['themeOverrides'];
}) => {
  const typeStyle = themeOverrides?.typeStyles?.[type];

  // Define base colors
  const baseColors = {
    background:
      themeOverrides?.background ||
      (theme.dark ? theme.colors.surfaceVariant : theme.colors.surface),
    text:
      themeOverrides?.text ||
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
  });
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
  messageContainerStyle,
  snackbarStyle,
  type = 'info',
  onDismiss,
}: ToastProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme, type }), [theme, type]);

  const windowDimensions = Dimensions.get('window');
  const insets = useSafeAreaInsets();

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

  return (
    <Snackbar
      onDismiss={handleDismiss}
      style={[
        styles.snackBarStyle,
        snackbarStyle,
        position === 'bottom' && {
          marginBottom: (snackbarStyle as ViewStyle)?.marginBottom || 0,
        },
      ]}
      wrapperStyle={computedStyle as StyleProp<ViewStyle>}
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
      <View style={[styles.defaultMessageContainer, messageContainerStyle]}>
        {loading && <ActivityIndicator />}
        {!loading && iconVisible && (
          <MaterialCommunityIcons
            name={icons[type]}
            style={[styles.iconStyle, iconStyle]}
            size={20}
          />
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.message, messageStyle]}>{`${message}`}</Text>
          {subMessage && (
            <Text style={[styles.subMessage, subMessageStyle]}>
              {subMessage}
            </Text>
          )}
        </View>
      </View>
    </Snackbar>
  );
};
