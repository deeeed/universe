import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const getStyles = ({ size, color }: { size: number; color: string }) => {
  return StyleSheet.create({
    pulseCircle: {
      height: size,
      width: size,
      backgroundColor: color,
      borderRadius: size / 2,
    },
  });
};

export interface LoadingPulseCircleProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
  color?: string;
  animationDuration?: number;
  minOpacity?: number;
  maxOpacity?: number;
}
export const LoadingPulseCircle = ({
  style,
  color = '#CCC',
  size = 50,
  animationDuration = 1000,
  minOpacity = 0.5,
  maxOpacity = 1,
}: LoadingPulseCircleProps) => {
  const styles = useMemo(() => getStyles({ size, color }), [size, color]);
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

  return <Animated.View style={[styles.pulseCircle, animatedStyles, style]} />;
};
