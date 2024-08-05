import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LoadingPulseBar } from './LoadingPulseBar/LoadingPulseBar';
import { LoadingPulseCircle } from './LoadingPulseCircle/LoadingPulseCircle';

interface SkeletonItem {
  circles: number;
  bars: number;
}

const getStyles = () => {
  return StyleSheet.create({
    container: {},
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10, // Adjust the spacing between rows as needed
    },
    circleContainer: {
      marginRight: 10, // Space between the circle and the bars
      gap: 10,
    },
    barContainer: {
      flex: 1,
      gap: 5,
      flexDirection: 'column',
      justifyContent: 'space-around', // This will distribute the bars evenly
    },
  });
};

const defaultSkeletonItems: SkeletonItem[] = [
  { circles: 1, bars: 3 },
  { circles: 1, bars: 3 },
];
export interface SkeletonProps {
  items?: SkeletonItem[];
  circleSize?: number;
  barHeight?: number;
  color?: string;
  animationDuration?: number;
  minOpacity?: number;
  maxOpacity?: number;
  style?: StyleProp<ViewStyle>;
}
export const Skeleton = ({
  items = defaultSkeletonItems,
  circleSize = 50,
  barHeight = 20,
  color = '#ccc',
  animationDuration = 1000,
  minOpacity = 0.5,
  maxOpacity = 1,
  style,
}: SkeletonProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => (
        <View key={`skeleton-item-${index}`} style={styles.itemRow}>
          <View style={styles.circleContainer}>
            {Array.from({ length: item.circles }, (_, circleIndex) => (
              <LoadingPulseCircle
                key={`circle-${circleIndex}`}
                size={circleSize}
                color={color}
                animationDuration={animationDuration}
                minOpacity={minOpacity}
                maxOpacity={maxOpacity}
              />
            ))}
          </View>
          <View style={styles.barContainer}>
            {Array.from({ length: item.bars }, (_, barIndex) => (
              <LoadingPulseBar
                key={`bar-${barIndex}`}
                height={barHeight}
                color={color}
                animationDuration={animationDuration}
                minOpacity={minOpacity}
                maxOpacity={maxOpacity}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};
