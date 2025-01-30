import type { FunctionComponent, ReactNode } from 'react';
import React, { createContext, useState } from 'react';
import type { DialogButton } from '../components/ConfirmDialog/ConfirmDialog';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  notice?: string;
  confirmButton?: Partial<DialogButton>;
  cancelButton?: Partial<DialogButton>;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ConfirmContextType {
  (options: ConfirmOptions): Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(
  undefined
);

export interface ConfirmProviderProps {
  children: ReactNode;
}

export const ConfirmProvider: FunctionComponent<ConfirmProviderProps> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const [resolve, setResolve] = useState<(value: boolean) => void | null>();

  const confirm: ConfirmContextType = (opts: ConfirmOptions) => {
    setOptions(opts);
    setIsVisible(true);
    return new Promise<boolean>((_resolve) => {
      setResolve(() => _resolve);
    });
  };

  const handleConfirm = (value: boolean) => {
    setIsVisible(false);
    if (resolve) resolve(value);
    if (value && options.onConfirm) options.onConfirm();
    if (!value && options.onCancel) options.onCancel();
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {isVisible ? (
        <ConfirmDialog
          visible={isVisible}
          title={options.title}
          notice={options.notice}
          confirmButton={{
            label: options.confirmButton?.label || 'Yes',
            onPress: () => handleConfirm(true),
            ...options.confirmButton,
          }}
          cancelButton={{
            label: options.cancelButton?.label || 'No',
            onPress: () => handleConfirm(false),
            ...options.cancelButton,
          }}
        />
      ) : undefined}
    </ConfirmContext.Provider>
  );
};
