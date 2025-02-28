import { useBottomSheet } from '@gorhom/bottom-sheet';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, ViewProps } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
  },
});

const DEFAULT_OPACITY = 0.5;
const DEFAULT_APPEARS_ON_INDEX = 1;
const DEFAULT_DISAPPEARS_ON_INDEX = 0;
const DEFAULT_ENABLE_TOUCH_THROUGH = false;
const DEFAULT_PRESS_BEHAVIOR = 'close' as const;

export interface CustomBackdropProps extends BottomSheetDefaultBackdropProps {
  testID?: string;
}

export const CustomBackdrop = ({
  animatedIndex,
  opacity: _providedOpacity,
  appearsOnIndex: _providedAppearsOnIndex,
  disappearsOnIndex: _providedDisappearsOnIndex,
  enableTouchThrough: _providedEnableTouchThrough,
  pressBehavior = DEFAULT_PRESS_BEHAVIOR,
  onPress,
  style,
  children,
  testID,
}: CustomBackdropProps) => {
  //#region hooks
  const { snapToIndex, close } = useBottomSheet();
  //#endregion

  //#region defaults
  const opacity = _providedOpacity ?? DEFAULT_OPACITY;
  const appearsOnIndex = _providedAppearsOnIndex ?? DEFAULT_APPEARS_ON_INDEX;
  const disappearsOnIndex =
    _providedDisappearsOnIndex ?? DEFAULT_DISAPPEARS_ON_INDEX;
  const enableTouchThrough =
    _providedEnableTouchThrough ?? DEFAULT_ENABLE_TOUCH_THROUGH;
  //#endregion

  //#region variables
  const [pointerEvents, setPointerEvents] = useState<
    ViewProps['pointerEvents']
  >(enableTouchThrough ? 'none' : 'auto');
  //#endregion

  //#region callbacks
  const handleOnPress = useCallback(() => {
    onPress?.();

    if (pressBehavior === 'close') {
      close();
    } else if (pressBehavior === 'collapse') {
      snapToIndex(disappearsOnIndex as number);
    } else if (typeof pressBehavior === 'number') {
      snapToIndex(pressBehavior);
    }
  }, [snapToIndex, close, disappearsOnIndex, pressBehavior, onPress]);
  const handleContainerTouchability = useCallback(
    (shouldDisableTouchability: boolean) => {
      setPointerEvents(shouldDisableTouchability ? 'none' : 'auto');
    },
    []
  );
  //#endregion

  //#region styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, disappearsOnIndex, appearsOnIndex],
      [0, opacity, opacity],
      Extrapolate.CLAMP
    ),
    flex: 1,
  }));
  const containerStyle = useMemo(
    () => [styles.container, style, containerAnimatedStyle],
    [style, containerAnimatedStyle]
  );
  //#endregion

  //#region effects
  useAnimatedReaction(
    () => animatedIndex.value <= disappearsOnIndex,
    (shouldDisableTouchability, previous) => {
      if (shouldDisableTouchability === previous || disappearsOnIndex === -1) {
        return;
      }
      runOnJS(handleContainerTouchability)(shouldDisableTouchability);
    },
    [disappearsOnIndex]
  );
  //#endregion

  return pressBehavior !== 'none' ? (
    <AnimatedPressable
      onPress={handleOnPress}
      style={containerStyle}
      pointerEvents={pointerEvents}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Bottom Sheet backdrop"
      accessibilityHint={`Tap to ${
        typeof pressBehavior === 'string' ? pressBehavior : 'move'
      } the Bottom Sheet`}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  ) : (
    <Animated.View
      pointerEvents={pointerEvents}
      style={containerStyle}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};
