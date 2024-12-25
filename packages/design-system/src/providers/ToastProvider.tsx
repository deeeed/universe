import React, { createContext, useEffect, useMemo, useReducer } from 'react';
import { Keyboard } from 'react-native';

import { Toast, ToastProps } from '../components/Toast/Toast';

// Make all partial except dismiss
export type ToastOptions = Partial<ToastProps>;

export interface ToastMethods {
  show(options: ToastOptions): void;
  loader(message: string, options?: ToastOptions): void;
  hide(): void;
}

export interface ToastProviderProps {
  overrides?: ToastOptions;
  children: React.ReactNode;
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
  (initialState: ToastProps) => (state: ToastProps, action: ToastAction) => {
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
  overrides,
}) => {
  const initialState: ToastProps = useMemo(
    () => ({
      visibility: false,
      message: '',
      type: 'info', // default type
      position: 'bottom', // default position
      iconVisible: true, // default icon visibility
      ...overrides,
    }),
    [overrides]
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

  useEffect(() => {
    dispatch({ type: ToastActionType.HYDRATE, payload: initialState });
  }, [initialState]);

  const handleDismiss = () => {
    state.onDismiss?.();
    toastMethods.hide();
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <Toast {...state} onDismiss={handleDismiss} />
    </ToastContext.Provider>
  );
};
