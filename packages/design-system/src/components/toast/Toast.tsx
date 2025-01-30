import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

import type { CursorValue, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import type { ToastIconType, ToastProps, ToastType } from './Toast.types';

export type ToastPosition = 'top' | 'bottom' | 'middle';

export interface ToastTypeStyles {
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
}

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
  duration = 5000,
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
  showCloseIcon = false,
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

    let style;
    if (position === 'bottom') {
      style = {
        ...base,
        bottom: insets.bottom,
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
  }, [insets, position, windowDimensions]);

  if (!visibility) return null;

  return (
    <View style={computedStyle as StyleProp<ViewStyle>}>
      <Snackbar
        onDismiss={onDismiss || (() => {})}
        style={[styles.snackBarStyle, snackbarStyle]}
        wrapperStyle={{ width: '100%', alignItems: 'center' }}
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
          <View style={styles.contentContainer}>
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
          </View>
          {showCloseIcon && (
            <MaterialCommunityIcons
              name="close"
              size={20}
              style={[styles.closeIcon, closeIconStyle]}
              onPress={onDismiss}
            />
          )}
        </View>
      </Snackbar>
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
      justifyContent: 'space-between',
      width: '100%',
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
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
      marginLeft: theme.padding.s,
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
