import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';
import { useTheme } from '../../../providers/ThemeProvider';
import { Button } from '../../Button/Button';

const getStyles = ({
  theme,
  bottom,
  left,
  right,
}: {
  theme: AppTheme;
  bottom: number;
  left: number;
  right: number;
}) => {
  const paddingBottom = bottom > 0 ? bottom : theme.padding.m;
  return StyleSheet.create({
    footer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderTopColor: theme.colors.outline,
      borderTopWidth: 1,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: theme.padding.m,
      paddingBottom: paddingBottom,
      paddingLeft: left + theme.padding.m,
      paddingRight: right + theme.padding.m,
    },
    finishButton: { paddingHorizontal: 20 },
    cancelButton: { paddingHorizontal: 20 },
  });
};

export interface ConfirmCancelFooterProps {
  onCancel?: () => void;
  onFinish?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ConfirmCancelFooter = ({
  onCancel,
  onFinish,
  containerStyle,
  testID,
}: ConfirmCancelFooterProps) => {
  const { bottom, left, right } = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(
    () => getStyles({ theme, bottom, left, right }),
    [theme, bottom, left, right]
  );
  const { t } = useTranslation('confirm_cancel_footer');

  return (
    <View style={[styles.footer, containerStyle]} testID={testID}>
      <Button
        mode="outlined"
        style={styles.cancelButton}
        onPress={onCancel}
        testID={testID ? `${testID}-cancel-button` : undefined}
      >
        {t('cancel')}
      </Button>
      <Button
        style={styles.finishButton}
        mode="contained"
        onPress={onFinish}
        testID={testID ? `${testID}-confirm-button` : undefined}
      >
        {t('confirm')}
      </Button>
    </View>
  );
};
