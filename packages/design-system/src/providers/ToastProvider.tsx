import React, { createContext, useMemo, useReducer } from 'react';
import { Keyboard, StyleProp, TextStyle, ViewStyle } from 'react-native';

import { SwipeableToast } from '../components/Toast/SwipeableToast';
import { Toast } from '../components/Toast/Toast2';
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
}

export enum ToastActionType {
  SHOW = 'SHOW',
  HIDE = 'HIDE',
  HYDRATE = 'HYDRATE',
}

export interface ToastAction {
  type: ToastActionType;
  payload?: ToastOptions;
}

export const ToastContext = createContext<ToastMethods | null>(null);

const reducer =
  (initialState: ToastProps & { swipeConfig?: SwipeConfig }) =>
  (state: ToastProps & { swipeConfig?: SwipeConfig }, action: ToastAction) => {
    switch (action.type) {
      case ToastActionType.SHOW:
        return { ...initialState, ...action.payload, visibility: true };
      case ToastActionType.HIDE:
        return { ...state, visibility: false };
      case ToastActionType.HYDRATE:
        return { ...initialState, ...action.payload };
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
}) => {
  const initialState: ToastProps = useMemo(
    () => ({
      visibility: false,
      message: '',
      type: 'info',
      position: 'bottom',
      iconVisible: true,
      swipeConfig,
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

  const [state, dispatch] = useReducer(reducer(initialState), initialState);

  const toastMethods = useMemo(
    () => ({
      show(options: ToastOptions) {
        dispatch({ type: ToastActionType.SHOW, payload: { ...options } });
        if (options.position === 'bottom') {
          Keyboard.dismiss();
        }
      },
      loader(message: string, options?: ToastOptions) {
        dispatch({
          type: ToastActionType.SHOW,
          payload: { ...options, message, loading: true },
        });
        if (options?.position === 'bottom') {
          Keyboard.dismiss();
        }
      },
      hide() {
        dispatch({ type: ToastActionType.HIDE });
      },
    }),
    []
  );

  const handleDismiss = () => {
    state.onDismiss?.();
    toastMethods.hide();
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      {state.swipeConfig?.isEnabled ? (
        <SwipeableToast {...state} onDismiss={handleDismiss} />
      ) : (
        <Toast {...state} onDismiss={handleDismiss} />
      )}
    </ToastContext.Provider>
  );
};
