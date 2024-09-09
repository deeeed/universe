import React, { useEffect } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnUI,
  measure,
  useAnimatedRef,
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
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  titleStyle,
  contentContainerStyle,
  children,
  expanded = false,
  onHeaderPress,
}) => {
  const theme = useTheme();
  const styles = getStyles({ theme });

  const contentHeight = useSharedValue(0);
  const animatedHeight = useSharedValue(0);
  const animatedRef = useAnimatedRef<Animated.View>();

  useEffect(() => {
    runOnUI(() => {
      'worklet';
      const measuredHeight = measure(animatedRef)?.height ?? 0;
      contentHeight.value = measuredHeight;
      if (expanded) {
        animatedHeight.value = withTiming(measuredHeight, {
          duration: 300,
        });
      }
    })();
  }, [expanded, children]);

  useEffect(() => {
    animatedHeight.value = withTiming(expanded ? contentHeight.value : 0, {
      duration: 300,
    });
  }, [expanded, contentHeight.value]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(expanded ? '90deg' : '0deg', { duration: 300 }) },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    contentHeight.value = height;
    if (expanded) {
      animatedHeight.value = withTiming(height, { duration: 300 });
    }
  };

  const handlePress = () => {
    if (onHeaderPress) {
      onHeaderPress();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={handlePress}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        <Animated.View style={iconAnimatedStyle}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.text}
          />
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        <Animated.View
          ref={animatedRef}
          style={[styles.content, contentContainerStyle]}
          onLayout={handleContentLayout}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
};
