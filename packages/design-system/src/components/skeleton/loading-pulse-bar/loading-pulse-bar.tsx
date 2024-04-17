import React, { useMemo } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const getStyles = ({
  height,
  color,
  width,
}: {
  height: number;
  color: string;
  width: DimensionValue;
}) => {
  return StyleSheet.create({
    pulseBar: {
      height,
      backgroundColor: color,
      borderRadius: 5,
      width,
    },
  });
};

export interface LoadingPulseBarProps {
  style?: StyleProp<ViewStyle>;
  height?: number;
  color?: string;
  width?: DimensionValue;
  animationDuration?: number;
  minOpacity?: number;
  maxOpacity?: number;
}
export const LoadingPulseBar = ({
  style,
  height = 20,
  color = '#ccc',
  width = '100%',
  animationDuration = 1000,
  minOpacity = 0.5,
  maxOpacity = 1,
}: LoadingPulseBarProps) => {
  const styles = useMemo(
    () => getStyles({ color, width, height }),
    [color, width, height]
  );
  const opacity = useSharedValue(minOpacity);
  opacity.value = withRepeat(
    withTiming(maxOpacity, { duration: animationDuration }),
    -1,
    true
  );

  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return <Animated.View style={[styles.pulseBar, animatedStyles, style]} />;
};
