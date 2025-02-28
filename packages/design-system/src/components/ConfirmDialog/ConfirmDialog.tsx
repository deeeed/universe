import React, { useMemo } from 'react';
import { StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';
import { Dialog, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { Button } from '../Button/Button';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      padding: theme.padding.m,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 400,
    },
    webContainer: Platform.select({
      web: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      } as unknown as ViewStyle,
      default: {},
    }),
    content: {
      gap: theme.gap.m,
      paddingVertical: theme.padding.m,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
    },
    notice: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.gap.s,
      marginTop: theme.margin.m,
    },
    button: {
      paddingHorizontal: theme.padding.l,
    },
  });
};

export interface DialogButton {
  label: string;
  onPress?: () => void;
  mode?: 'text' | 'outlined' | 'contained';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  notice?: string;
  confirmButton?: Partial<DialogButton>;
  cancelButton?: Partial<DialogButton>;
  onDismiss?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  noticeStyle?: TextStyle;
  actionsStyle?: ViewStyle;
  dialogStyle?: ViewStyle;
  testID?: string;
}

export function ConfirmDialog({
  visible,
  title,
  notice,
  confirmButton,
  cancelButton,
  onDismiss,
  style,
  contentStyle,
  titleStyle,
  noticeStyle,
  actionsStyle,
  dialogStyle,
  testID,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const defaultConfirmButton: DialogButton = {
    label: 'Confirm',
    onPress: () => {},
    mode: 'contained',
    ...confirmButton,
  };

  const defaultCancelButton: DialogButton = {
    label: 'Cancel',
    onPress: onDismiss ?? (() => {}),
    mode: 'text',
    ...cancelButton,
  };

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      style={[styles.container, styles.webContainer, dialogStyle, style]}
      testID={testID}
    >
      <Dialog.Content
        style={[styles.content, contentStyle]}
        testID={`${testID}-content`}
      >
        <Text style={[styles.title, titleStyle]} testID={`${testID}-title`}>
          {title}
        </Text>
        {notice && (
          <Text
            style={[styles.notice, noticeStyle]}
            testID={`${testID}-notice`}
          >
            {notice}
          </Text>
        )}
        <Dialog.Actions
          style={[styles.actions, actionsStyle]}
          testID={`${testID}-actions`}
        >
          <Button
            mode={defaultCancelButton.mode}
            onPress={defaultCancelButton.onPress}
            loading={defaultCancelButton.loading}
            disabled={defaultCancelButton.disabled}
            style={[styles.button, defaultCancelButton.style]}
            labelStyle={defaultCancelButton.labelStyle}
            testID={`${testID}-cancel-button`}
          >
            {defaultCancelButton.label}
          </Button>
          <Button
            mode={defaultConfirmButton.mode}
            onPress={defaultConfirmButton.onPress}
            loading={defaultConfirmButton.loading}
            disabled={defaultConfirmButton.disabled}
            style={[styles.button, defaultConfirmButton.style]}
            labelStyle={defaultConfirmButton.labelStyle}
            testID={`${testID}-confirm-button`}
          >
            {defaultConfirmButton.label}
          </Button>
        </Dialog.Actions>
      </Dialog.Content>
    </Dialog>
  );
}
