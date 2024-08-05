import React, { useMemo } from 'react';
import {
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { ButtonProps, Text } from 'react-native-paper';
import { Button } from '../Button/Button';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../hooks/useAppThemeSetup';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.padding.l,
      gap: 10,
    },
    imgWrap: {
      margin: 0,
    },
    img: {
      width: 60,
      height: 60,
    },
    titleContainer: {},
    titleText: {},
    messageContainer: {},
    messageText: {},
    buttonWrap: {
      flexDirection: 'row',
      gap: 10,
    },
    extraContainer: {},
    button: {
      flex: 1,
    },
  });
};

export interface ResultProps {
  status?: 'success' | 'error' | 'info' | 'warning';
  img?: React.ReactNode;
  imgUrl?: ImageSourcePropType;
  imgStyle?: StyleProp<ImageStyle>;
  title: React.ReactNode;
  message?: React.ReactNode;
  buttonText?: string;
  buttonMode?: ButtonProps['mode'];
  secondaryButtonText?: string;
  secondaryButtonMode?: ButtonProps['mode'];
  style?: StyleProp<ViewStyle>;
  extra?: React.ReactNode;
  onButtonPress?: (e: GestureResponderEvent) => void;
  onSecondaryButtonPress?: (e: GestureResponderEvent) => void;
}
export const Result = ({
  buttonText = 'ACTION',
  buttonMode = 'contained',
  secondaryButtonMode = 'outlined',
  secondaryButtonText,
  status = 'info',
  img,
  imgUrl,
  imgStyle,
  message,
  extra,
  onButtonPress,
  onSecondaryButtonPress,
  style,
  title,
}: ResultProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  let imgContent: React.ReactNode | null = null;
  if (img) {
    imgContent = <View style={styles.imgWrap}>{img}</View>;
  } else if (imgUrl) {
    imgContent = (
      <View style={styles.imgWrap}>
        <Image source={imgUrl} style={[styles.img, imgStyle]} />
      </View>
    );
  } else {
    let icon: keyof (typeof MaterialCommunityIcons)['glyphMap'] = 'information';
    const iconColor = {
      info: theme.colors.info,
      warning: theme.colors.warning,
      error: theme.colors.error,
      success: theme.colors.success,
    }[status];
    switch (status) {
      case 'success':
        icon = 'check-circle';
        break;
      case 'error':
        icon = 'close-circle';
        break;
      case 'info':
        icon = 'information';
        break;
      case 'warning':
        icon = 'alert';
        break;
    }
    imgContent = (
      <MaterialCommunityIcons name={icon} size={60} color={iconColor} />
    );
  }

  return (
    <View style={[styles.container, style]}>
      {imgContent}
      {title ? (
        <View style={styles.titleContainer}>
          <Text variant="headlineMedium" style={styles.titleText}>
            {title}
          </Text>
        </View>
      ) : null}
      {message ? (
        <View style={styles.messageContainer}>
          <Text variant="bodyMedium" style={styles.messageText}>
            {message}
          </Text>
        </View>
      ) : null}
      <View style={styles.buttonWrap}>
        {onButtonPress ? (
          <Button
            style={styles.button}
            mode={buttonMode}
            onPress={onButtonPress}
          >
            {buttonText}
          </Button>
        ) : null}
        {secondaryButtonText ? (
          <Button mode={secondaryButtonMode} onPress={onSecondaryButtonPress}>
            {secondaryButtonText}
          </Button>
        ) : null}
      </View>
      {extra && <View style={styles.extraContainer}>{extra}</View>}
    </View>
  );
};
