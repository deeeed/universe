import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';
import { useTheme } from '../../../providers/ThemeProvider';
import { Button } from '../../Button/Button';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    footer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderTopColor: theme.colors.outline,
      borderTopWidth: 1,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: theme.padding.m,
    },
    finishButton: { paddingHorizontal: 20 },
    cancelButton: { paddingHorizontal: 20 },
  });
};

export interface ConfirmCancelFooterProps {
  onCancel?: () => void;
  onFinish?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ConfirmCancelFooter = ({
  onCancel,
  onFinish,
  containerStyle,
}: ConfirmCancelFooterProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation('confirm_cancel_footer');

  return (
    <View style={[styles.footer, containerStyle]}>
      <Button mode="outlined" style={styles.cancelButton} onPress={onCancel}>
        {t('cancel')}
      </Button>
      <Button style={styles.finishButton} mode="contained" onPress={onFinish}>
        {t('confirm')}
      </Button>
    </View>
  );
};
