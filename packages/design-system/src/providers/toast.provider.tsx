import React, { createContext, useEffect, useMemo, useReducer } from 'react';
import { Keyboard } from 'react-native';

import { Toast, ToastProps } from '../components/toast/toast';

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

const reducer = (state: ToastProps, action: ToastAction) => {
  switch (action.type) {
    case ToastActionType.SHOW:
      return { ...state, ...action.payload, visibility: true };
    case ToastActionType.HIDE:
      return { ...state, visibility: false };
    case ToastActionType.HYDRATE:
      return { ...state, ...action.payload };
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
      onDismiss: () => {},
      type: 'info', // default type
      position: 'bottom', // default position
      iconVisible: false, // default icon visibility
      ...overrides,
    }),
    [overrides]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

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

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <Toast {...state} onDismiss={() => toastMethods.hide()} />
    </ToastContext.Provider>
  );
};
