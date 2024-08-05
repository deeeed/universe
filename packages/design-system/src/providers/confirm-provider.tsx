import type { FunctionComponent, ReactNode } from 'react';
import React, { createContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';
import { AppTheme } from '../hooks/useAppThemeSetup';
import { useTheme } from './theme-provider';

export interface ConfirmOptions {
  title: string;
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
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

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    // hack to make sure the dialog is centered on web
    fixedDialog: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000, // Ensure it's on top
    } as unknown as ViewStyle,
    title: {
      textAlign: 'center',
      fontSize: theme.fonts.bodyLarge.fontSize,
    },
    notice: {
      paddingTop: 15,
      textAlign: 'center',
      fontSize: theme.fonts.bodyMedium.fontSize,
    },
  });

export const ConfirmProvider: FunctionComponent<ConfirmProviderProps> = ({
  children,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const [resolve, setResolve] = useState<(value: boolean) => void | null>();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const dialogStyle = useMemo(() => {
    if (Platform.OS === 'web') {
      return styles.fixedDialog;
    }
    return {};
  }, [styles]);

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
          title={options.title}
          notice={options.notice}
          confirmLabel={options.confirmLabel || 'Yes'}
          cancelLabel={options.cancelLabel || 'No'}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
          style={dialogStyle}
        />
      ) : undefined}
    </ConfirmContext.Provider>
  );
};
