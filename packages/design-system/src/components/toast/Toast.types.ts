import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

export interface SwipeConfig {
  isEnabled?: boolean;
  direction?: 'left-to-right' | 'right-to-left' | 'both';
  initialThreshold?: number;
  dismissThreshold?: number;
  velocityThreshold?: number;
  animationDuration?: number;
  dismissDistance?: number;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top' | 'bottom' | 'middle';

export interface ToastTypeStyles {
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
}

export interface ToastProps {
  message: string;
  subMessage?: string;
  type?: ToastType;
  position?: ToastPosition;
  duration?: number;
  loading?: boolean;
  visibility?: boolean;
  iconVisible?: boolean;
  action?: () => void;
  actionLabel?: string;
  messageStyle?: StyleProp<ViewStyle>;
  subMessageStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<TextStyle>;
  messageContainerStyle?: StyleProp<ViewStyle>;
  snackbarStyle?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
  themeOverrides?: {
    background?: string;
    text?: string;
    typeStyles?: {
      [key in ToastType]?: ToastTypeStyles;
    };
  };
  showCloseIcon?: boolean;
  closeIconStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export interface SwipeableToastProps extends ToastProps {
  swipeConfig?: SwipeConfig;
}

type MaterialIconName = keyof (typeof MaterialCommunityIcons)['glyphMap'];

export type ToastIconType = {
  [key in ToastType]: MaterialIconName;
};
