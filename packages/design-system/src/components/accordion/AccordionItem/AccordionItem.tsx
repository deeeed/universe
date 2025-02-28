import React, { useCallback } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  WithTimingConfig,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {},
    header: {
      padding: 12,
      backgroundColor: theme.colors.primaryContainer,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      color: theme.colors.text,
    },
    contentContainer: {
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    content: {
      padding: 5,
    },
  });
};

export interface AccordionItemData {
  title: string;
  expanded?: boolean;
  onHeaderPress?: () => void;
}

export interface AccordionItemProps extends AccordionItemData {
  children: React.ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const animationConfig: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
};

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  titleStyle,
  contentContainerStyle,
  children,
  expanded = false,
  onHeaderPress,
  testID,
}) => {
  const theme = useTheme();
  const styles = getStyles({ theme });

  const animationProgress = useSharedValue(expanded ? 1 : 0);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
    height: animationProgress.value === 0 ? 0 : 'auto',
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animationProgress.value * 90}deg` }],
  }));

  const handlePress = useCallback(() => {
    if (onHeaderPress) {
      onHeaderPress();
    }
    animationProgress.value = withTiming(
      animationProgress.value === 0 ? 1 : 0,
      animationConfig
    );
  }, [onHeaderPress]);

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        style={styles.header}
        onPress={handlePress}
        testID={testID ? `${testID}-header` : undefined}
      >
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        <Animated.View style={iconAnimatedStyle}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.text}
          />
        </Animated.View>
      </Pressable>
      <Animated.View
        style={[
          styles.contentContainer,
          contentAnimatedStyle,
          contentContainerStyle,
        ]}
        testID={testID ? `${testID}-content` : undefined}
      >
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
};
