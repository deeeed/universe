import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface DarkLightToggleProps {
  /** Height of the toggle in pixels. All other dimensions are calculated from this. */
  height?: number;
  /** Base duration for the toggle animation in ms */
  toggleDuration?: number;
  /** Base duration for star fade animation in ms */
  starBaseDuration?: number;
  /** Delay between each star animation in ms */
  starStaggerDelay?: number;
  /** Custom colors */
  colors?: {
    nightBg: string;
    dayBg: string;
    moon: string;
    sun: string;
    star: string;
  };
  /** Current theme mode */
  isDark?: boolean;
  /** Callback when toggle is pressed */
  onToggle?: (isDark: boolean) => void;
}

function calculateSizes(height: number) {
  const width = height * 1.618;
  const moonSize = height * 0.6;
  const sunSize = moonSize * 0.7;
  const starSize = height * 0.15;
  // Reduce to 3 stars
  const starCount = 3;

  return {
    toggleHeight: height,
    toggleWidth: width,
    moonSize,
    sunSize,
    starSize,
    starCount,
  };
}

const DEFAULT_CONFIG = {
  height: 40, // Default compact size
  toggleDuration: 500,
  starBaseDuration: 200,
  starStaggerDelay: 50,
  colors: {
    nightBg: '#423966',
    dayBg: '#FFBF71',
    moon: '#D9FBFF',
    sun: '#fff',
    star: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

export const DarkLightToggle = ({
  height = DEFAULT_CONFIG.height,
  toggleDuration = DEFAULT_CONFIG.toggleDuration,
  starBaseDuration = DEFAULT_CONFIG.starBaseDuration,
  starStaggerDelay = DEFAULT_CONFIG.starStaggerDelay,
  colors = DEFAULT_CONFIG.colors,
  isDark = false,
  onToggle,
}: DarkLightToggleProps = {}) => {
  const sizes = calculateSizes(height);
  const progress = useSharedValue(isDark ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(isDark ? 0 : 1, { duration: toggleDuration });
  }, [isDark, toggleDuration]);

  const starStyle1 = useAnimatedStyle(() => ({
    opacity: withTiming(1 - progress.value, {
      duration: starBaseDuration,
    }),
  }));
  const starStyle2 = useAnimatedStyle(() => ({
    opacity: withTiming(1 - progress.value, {
      duration: starBaseDuration + starStaggerDelay,
    }),
  }));
  const starStyle3 = useAnimatedStyle(() => ({
    opacity: withTiming(1 - progress.value, {
      duration: starBaseDuration + starStaggerDelay * 2,
    }),
  }));

  const handleToggle = () => {
    onToggle?.(!isDark);
  };

  const toggleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.nightBg, colors.dayBg]
    ),
  }));

  const moonSunStyle = useAnimatedStyle(() => {
    // Calculate the available space for translation
    const padding = sizes.moonSize * 0.2; // 20% padding on each side
    const availableWidth = sizes.toggleWidth - sizes.moonSize - padding * 2;

    // Translate within the available space
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [padding, availableWidth + padding]
    );

    // Center vertically
    const translateY = (sizes.toggleHeight - sizes.moonSize) / 2;

    const rotate = interpolate(progress.value, [0, 1], [-75, 0]);
    const scale = interpolate(progress.value, [0, 1], [1, 0.7]);

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const styles = StyleSheet.create({
    container: {
      marginRight: 8,
      marginLeft: 8,
    },
    toggle: {
      height: sizes.toggleHeight,
      width: sizes.toggleWidth,
      borderRadius: sizes.toggleHeight / 2,
      position: 'relative',
      overflow: 'hidden',
    },
    moonSun: {
      position: 'absolute',
      width: sizes.moonSize,
      height: sizes.moonSize,
      borderRadius: sizes.moonSize / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moon: {
      width: '100%',
      height: '100%',
      borderRadius: sizes.moonSize / 2,
      backgroundColor: colors.moon,
      overflow: 'hidden',
      position: 'relative',
    },
    crescentOverlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: sizes.moonSize / 2,
      backgroundColor: colors.nightBg,
      transform: [{ rotate: '90deg' }],
      right: '-5%',
      top: '-30%',
    },
    sunContainer: {
      position: 'relative',
      width: sizes.sunSize * 2.5,
      height: sizes.sunSize * 2.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sun: {
      position: 'absolute',
      width: sizes.sunSize,
      height: sizes.sunSize,
      borderRadius: sizes.sunSize / 2,
      backgroundColor: colors.sun,
      top: '50%',
      left: '50%',
      transform: [
        { translateX: -sizes.sunSize / 2 },
        { translateY: -sizes.sunSize / 2 },
      ],
      shadowColor: colors.sun,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 15,
    },
    sunRays: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    sunRay: {
      position: 'absolute',
      backgroundColor: colors.sun,
      shadowColor: colors.sun,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
    },
    star: {
      position: 'absolute',
      width: sizes.starSize,
      height: sizes.starSize,
      borderRadius: sizes.starSize / 2,
      backgroundColor: colors.star,
    },
    star1: {
      right: '25%',
      top: '15%',
    },
    star2: {
      right: '35%',
      top: '50%',
    },
    star3: {
      right: '25%',
      top: '85%',
    },
  });

  const SunRays = () => {
    const rayPositions = Array.from({ length: 8 }).map((_, index) => {
      const angle = index * 45 * (Math.PI / 180);
      const isLargeRay = index % 2 === 0;
      const distance = sizes.sunSize * 0.85;

      // Calculate position from center
      const centerX = sizes.sunSize * 1.25;
      const centerY = sizes.sunSize * 1.25;

      return {
        top:
          centerY +
          Math.sin(angle) * distance -
          (isLargeRay ? sizes.sunSize * 0.1 : sizes.sunSize * 0.075),
        left:
          centerX +
          Math.cos(angle) * distance -
          (isLargeRay ? sizes.sunSize * 0.1 : sizes.sunSize * 0.075),
        width: isLargeRay ? sizes.sunSize * 0.2 : sizes.sunSize * 0.15,
        height: isLargeRay ? sizes.sunSize * 0.2 : sizes.sunSize * 0.15,
        borderRadius: isLargeRay ? sizes.sunSize * 0.1 : sizes.sunSize * 0.075,
        shadowRadius: isLargeRay ? 6 : 3,
      };
    });

    return (
      <View style={styles.sunContainer}>
        <View style={styles.sun} />
        <View style={styles.sunRays}>
          {rayPositions.map((position, index) => (
            <View
              key={index}
              style={[
                styles.sunRay,
                {
                  ...position,
                  position: 'absolute',
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleToggle}>
        <Animated.View style={[styles.toggle, toggleStyle]}>
          <Animated.View style={[styles.moonSun, moonSunStyle]}>
            {isDark ? (
              <View style={styles.moon}>
                <View style={styles.crescentOverlay} />
              </View>
            ) : (
              <SunRays />
            )}
          </Animated.View>
          <Animated.View style={[styles.star, styles.star1, starStyle1]} />
          <Animated.View style={[styles.star, styles.star2, starStyle2]} />
          <Animated.View style={[styles.star, styles.star3, starStyle3]} />
        </Animated.View>
      </Pressable>
    </View>
  );
};
