import React, { useMemo } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { Dialog } from 'react-native-paper';
import { AppTheme } from '../../hooks/useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { Button } from '../button/Button';

const getStyles = (_: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {},
  });
};

export interface ConfirmDialogProps {
  title: string;
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  style?: ViewStyle;
}

export const ConfirmDialog = ({
  title,
  notice,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  style,
}: ConfirmDialogProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  return (
    <Dialog
      style={[styles.container, style]}
      visible={true}
      onDismiss={onCancel}
    >
      <Dialog.Content>
        <Text>{title}</Text>
        {notice && <Text>{notice}</Text>}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onConfirm}>{confirmLabel}</Button>
        <Button onPress={onCancel}>{cancelLabel}</Button>
      </Dialog.Actions>
    </Dialog>
  );
};
