import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type NoticeType = 'info' | 'warning' | 'error' | 'success';
const getStyles = ({ theme, type }: { theme: AppTheme; type: NoticeType }) => {
  const backgroundColor = {
    info: theme.colors.infoContainer,
    warning: theme.colors.warningContainer,
    error: theme.colors.errorContainer,
    success: theme.colors.successContainer,
  }[type];

  const iconColor = {
    info: theme.colors.info,
    warning: theme.colors.warning,
    error: theme.colors.error,
    success: theme.colors.success,
  }[type];

  return StyleSheet.create({
    container: {
      padding: 10,
      backgroundColor: backgroundColor,
      gap: 5,
      flexDirection: 'row',
      justifyContent: 'center',
      alignContent: 'center',
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignContent: 'center',
    },
    text: {
      color: theme.colors.onSurface,
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: 'bold',
    },
    iconContainer: {
      justifyContent: 'center',
      alignContent: 'center',
    },
    iconStyle: {
      color: iconColor,
    },
    closeIcon: {
      marginLeft: 'auto',
    },
  });
};

export interface NoticeProps {
  title?: string;
  message?: string;
  type: NoticeType;
  withIcon?: boolean;
  iconStyle?: StyleProp<TextStyle>;
  closable?: boolean;
  onClose?: () => void;
  testID?: string;
}
type IconName = keyof (typeof MaterialCommunityIcons)['glyphMap'];

const icons: { [key in NoticeType]: IconName } = {
  info: 'information-outline',
  warning: 'alert-circle-outline',
  success: 'check-circle-outline',
  error: 'close-circle-outline',
};

export const Notice = ({
  title,
  withIcon = true,
  iconStyle,
  closable = false,
  onClose,
  message,
  type,
  testID,
}: NoticeProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme, type }), [theme, type]);
  const hasMessage = message && message.length > 0;
  const [closed, setClosed] = useState(false);

  const handleClose = useCallback(() => {
    setClosed(true);
    onClose?.();
  }, [onClose]);

  if (closed) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={styles.iconContainer}
        testID={testID ? `${testID}-icon-container` : undefined}
      >
        {withIcon && (
          <MaterialCommunityIcons
            name={icons[type]}
            style={[styles.iconStyle, iconStyle]}
            size={20}
            testID={testID ? `${testID}-icon` : undefined}
          />
        )}
      </View>
      <View
        style={styles.contentContainer}
        testID={testID ? `${testID}-content` : undefined}
      >
        {title && (
          <Text
            style={styles.title}
            testID={testID ? `${testID}-title` : undefined}
          >
            {title}
          </Text>
        )}
        {hasMessage ? (
          <Text testID={testID ? `${testID}-message` : undefined}>
            {message}
          </Text>
        ) : null}
      </View>
      {closable && (
        <Pressable
          onPress={handleClose}
          style={styles.closeIcon}
          testID={testID ? `${testID}-close-button` : undefined}
        >
          <MaterialCommunityIcons
            name="close"
            style={styles.iconStyle}
            size={20}
            testID={testID ? `${testID}-close-icon` : undefined}
          />
        </Pressable>
      )}
    </View>
  );
};
