import {
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
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

export interface ConfirmCancelFooterProps extends BottomSheetFooterProps {
  onCancel?: () => void;
  onFinish?: () => void;
}

export const ConfirmCancelFooter = (props: ConfirmCancelFooterProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation('confirm_cancel_footer');

  return (
    <BottomSheetFooter {...props} style={styles.footer}>
      <Button
        mode="outlined"
        style={styles.cancelButton}
        onPress={props.onCancel}
      >
        {t('cancel')}
      </Button>
      <Button
        style={styles.finishButton}
        mode="contained"
        onPress={props.onFinish}
      >
        {t('finish')}
      </Button>
    </BottomSheetFooter>
  );
};
