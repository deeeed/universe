import {
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '../../../providers/ThemeProvider';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTheme } from '../../../hooks/useAppThemeSetup';
import { Button } from '../../Button/Button';
import React from 'react';
import { useTranslation } from 'react-i18next';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    footer: {
      borderTopWidth: 2,
      backgroundColor: 'white',
      borderTopColor: theme.colors.outline,
      // marginBottom: 20,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
    },
    finishButton: {},
    cancelButton: {},
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
    <BottomSheetFooter {...props}>
      <View style={styles.footer}>
        <Button style={styles.cancelButton} onPress={props.onCancel}>
          {t('cancel')}
        </Button>
        <Button
          style={styles.finishButton}
          mode="contained"
          onPress={props.onFinish}
        >
          {t('finish')}
        </Button>
      </View>
    </BottomSheetFooter>
  );
};
