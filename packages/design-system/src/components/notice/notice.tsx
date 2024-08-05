import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {withIcon && (
          <MaterialCommunityIcons
            name={icons[type]}
            style={[styles.iconStyle, iconStyle]}
            size={20}
          />
        )}
      </View>
      <View style={styles.contentContainer}>
        {title && <Text style={styles.title}>{title}</Text>}
        {hasMessage ? <Text>{message}</Text> : null}
      </View>
      {closable && (
        <Pressable onPress={handleClose} style={styles.closeIcon}>
          {/* Insert close icon here */}
          <MaterialCommunityIcons
            name="close"
            style={styles.iconStyle}
            size={20}
          ></MaterialCommunityIcons>
        </Pressable>
      )}
    </View>
  );
};
