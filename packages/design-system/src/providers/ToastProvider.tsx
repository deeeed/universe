import React, { createContext, useMemo, useReducer } from 'react';
import { Keyboard, StyleProp, TextStyle, ViewStyle } from 'react-native';

import { SwipeableToast } from '../components/Toast/SwipeableToast';
import { Toast } from '../components/Toast/Toast';
import type { SwipeConfig, ToastProps } from '../components/Toast/Toast.types';

// Make all partial except dismiss
export type ToastOptions = Partial<ToastProps> & {
  swipeConfig?: SwipeConfig;
};

export interface ToastMethods {
  show(options: ToastOptions): void;
  loader(message: string, options?: ToastOptions): void;
  hide(): void;
}

export interface ToastStyleOverrides {
  snackbarStyle?: StyleProp<ViewStyle>;
  messageStyle?: StyleProp<TextStyle>;
  subMessageStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<TextStyle>;
  messageContainerStyle?: StyleProp<ViewStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  actionButtonTextStyle?: StyleProp<TextStyle>;
  closeIconStyle?: StyleProp<TextStyle>;
}

export interface ToastProviderProps {
  styleOverrides?: ToastStyleOverrides;
  defaultOptions?: Partial<Omit<ToastProps, keyof ToastStyleOverrides>>;
  children: React.ReactNode;
  swipeConfig?: Pick<SwipeConfig, 'isEnabled' | 'direction'>;
  showCloseIcon?: boolean;
  isStackable?: boolean;
}

// Add a unique ID to each toast
interface ToastState extends ToastProps {
  id: string;
  swipeConfig?: SwipeConfig;
  message: string;
}

export enum ToastActionType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  HIDE_ALL = 'HIDE_ALL',
}

export interface ToastAction {
  type: ToastActionType;
  payload?: {
    options?: ToastOptions;
    id?: string;
    isStackable?: boolean;
  };
}

export const ToastContext = createContext<ToastMethods | null>(null);

let toastIdCounter = 0;
const getNextId = () => `toast-${++toastIdCounter}`;

const reducer =
  (initialState: ToastState[]) =>
  (state: ToastState[], action: ToastAction): ToastState[] => {
    switch (action.type) {
      case ToastActionType.ADD: {
        // Deep clone the provider defaults
        const providerDefaults = JSON.parse(JSON.stringify(initialState[0]));
        const options = action.payload?.options ?? {};

        // Create new toast - hook options should ALWAYS override provider defaults
        const newToast: ToastState = {
          ...providerDefaults, // Start with provider defaults
          id: getNextId(),
          visibility: true,
          // Spread ALL options from the hook call - they take precedence over provider defaults
          ...options,
        };

        return action.payload?.isStackable ? [...state, newToast] : [newToast];
      }
      case ToastActionType.REMOVE:
        return state.filter((toast) => toast.id !== action.payload?.id);
      case ToastActionType.HIDE_ALL: {
        const providerDefaults = JSON.parse(JSON.stringify(initialState[0]));
        return state.map((toast) => ({
          ...providerDefaults,
          ...toast, // Maintain toast's own properties
          visibility: false,
        }));
      }
      default:
        return state;
    }
  };

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  styleOverrides = {},
  defaultOptions = {},
  swipeConfig = { isEnabled: true, direction: 'right-to-left' },
  showCloseIcon = false,
  isStackable = false,
}) => {
  const baseState: Omit<ToastState, 'id'> = useMemo(
    () => ({
      visibility: false,
      message: '',
      type: 'info',
      position: 'bottom',
      iconVisible: true,
      duration: 4000,
      swipeConfig: { ...swipeConfig },
      showCloseIcon,
      ...defaultOptions,
      snackbarStyle: styleOverrides.snackbarStyle,
      messageStyle: styleOverrides.messageStyle,
      subMessageStyle: styleOverrides.subMessageStyle,
      iconStyle: styleOverrides.iconStyle,
      messageContainerStyle: styleOverrides.messageContainerStyle,
      closeIconStyle: styleOverrides.closeIconStyle,
    }),
    [defaultOptions, styleOverrides, swipeConfig, showCloseIcon]
  );

  const initialState: ToastState[] = [{ ...baseState, id: getNextId() }];

  const [toasts, dispatch] = useReducer<
    (state: ToastState[], action: ToastAction) => ToastState[]
  >(reducer(initialState), initialState);

  const toastMethods = useMemo(
    () => ({
      show(options: ToastOptions) {
        dispatch({
          type: ToastActionType.ADD,
          payload: { options, isStackable },
        });
        if (options.position === 'bottom') {
          Keyboard.dismiss();
        }
      },
      loader(message: string, options?: ToastOptions) {
        dispatch({
          type: ToastActionType.ADD,
          payload: {
            options: { ...options, message, loading: true },
            isStackable,
          },
        });
        if (options?.position === 'bottom') {
          Keyboard.dismiss();
        }
      },
      hide() {
        dispatch({ type: ToastActionType.HIDE_ALL });
      },
    }),
    [isStackable]
  );

  const handleDismiss = (id: string, onDismiss?: () => void) => {
    onDismiss?.();
    dispatch({ type: ToastActionType.REMOVE, payload: { id } });
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      {toasts.map((toast: ToastState, index: number) => {
        const baseMarginBottom = Number(
          (styleOverrides?.snackbarStyle as ViewStyle)?.marginBottom || 0
        );
        const stackingStyle: ViewStyle = {
          marginBottom: isStackable
            ? baseMarginBottom + index * 10
            : baseMarginBottom,
        };

        return toast.swipeConfig?.isEnabled ? (
          <SwipeableToast
            key={toast.id}
            {...defaultOptions} // Spread default options first
            {...toast} // Then use current toast properties
            onDismiss={() => handleDismiss(toast.id, toast.onDismiss)}
            snackbarStyle={[
              toast.snackbarStyle,
              styleOverrides?.snackbarStyle,
              stackingStyle,
            ]}
          />
        ) : (
          <Toast
            key={toast.id}
            {...defaultOptions} // Spread default options first
            {...toast} // Then use current toast properties
            onDismiss={() => handleDismiss(toast.id, toast.onDismiss)}
            snackbarStyle={[
              toast.snackbarStyle,
              styleOverrides?.snackbarStyle,
              stackingStyle,
            ]}
          />
        );
      })}
    </ToastContext.Provider>
  );
};
