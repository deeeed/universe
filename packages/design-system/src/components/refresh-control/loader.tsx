import React, { useEffect, useMemo } from 'react';
import { ColorValue, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
} from 'react-native-reanimated';
import { AppTheme } from '../../hooks/useAppThemeSetup';
import { useTheme } from '../../providers/theme-provider';

const getStyles = ({
  backgroundColor,
  size,
  theme,
}: {
  backgroundColor?: ColorValue;
  size: number;
  theme: AppTheme;
}) =>
  StyleSheet.create({
    loader: {
      height: size,
      width: size,
      backgroundColor: backgroundColor ?? theme.colors.primary,
      marginTop: 5,
    },
  });

interface LoaderProps {
  color?: ColorValue;
  size?: number;
}

export const Loader = ({ color, size = 40 }: LoaderProps) => {
  const theme = useTheme();
  const rotateValue = useSharedValue(0);
  const styles = useMemo(
    () => getStyles({ theme, size, backgroundColor: color }),
    [color, size, theme]
  );
  const handleRotation = (value: number): string => {
    'worklet';
    return `${value * 4 * Math.PI}rad`;
  };

  const rotateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: handleRotation(rotateValue.value) },
        { scale: rotateValue.value + 0.3 },
      ],
      opacity: rotateValue.value + 0.2,
      borderRadius: rotateValue.value * 20,
    };
  });

  useEffect(() => {
    rotateValue.value = withRepeat(withSpring(0.5), -1, true);
  }, []);

  return <Animated.View style={[styles.loader, rotateStyles]} />;
};
