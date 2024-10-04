import NativeSlider from '@react-native-community/slider';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

const getStyles = ({
  theme,
  disabled,
}: {
  theme: AppTheme;
  disabled: boolean;
}) => {
  return StyleSheet.create({
    container: {
      width: '100%',
      opacity: disabled ? 0.5 : 1,
    },
    label: {
      marginBottom: 8,
      color: disabled ? theme.colors.outline : theme.colors.text,
    },
    webSlider: {
      width: '100%',
      height: 30,
      // Remove cursor property from here
    },
    valueLabel: {
      marginTop: 8,
      textAlign: 'right',
      color: disabled ? theme.colors.outline : theme.colors.text,
    },
  });
};

export interface SliderProps {
  label?: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  step?: number;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  sliderStyle?: ViewStyle;
  valueLabelStyle?: TextStyle;
  onSlidingStart?: () => void;
}

export const Slider: React.FC<SliderProps> = ({
  label = '',
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  onSlidingComplete,
  disabled = false,
  step = 1,
  showValue = false,
  valueFormatter = (val: number) => val.toString(),
  containerStyle,
  labelStyle,
  sliderStyle,
  valueLabelStyle,
  onSlidingStart,
}) => {
  const theme = useTheme();
  const defaultStyles = useMemo(
    () => getStyles({ theme, disabled }),
    [theme, disabled]
  );

  const handleWebSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onValueChange(Number(event.target.value));
      }
    },
    [onValueChange, disabled]
  );

  const handleWebSliderComplete = useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      if (!disabled) {
        const inputElement = event.currentTarget as HTMLInputElement;
        onSlidingComplete?.(Number(inputElement.value));
      }
    },
    [onSlidingComplete, disabled]
  );

  const handleWebSliderStart = useCallback(() => {
    if (!disabled && onSlidingStart) {
      onSlidingStart();
    }
  }, [disabled, onSlidingStart]);

  const renderSlider = () => {
    const combinedSliderStyle = StyleSheet.flatten([
      defaultStyles.webSlider,
      sliderStyle,
    ]);

    if (Platform.OS === 'web') {
      return (
        <input
          type="range"
          min={minimumValue}
          max={maximumValue}
          value={value}
          onChange={handleWebSliderChange}
          onMouseDown={handleWebSliderStart}
          onMouseUp={handleWebSliderComplete}
          style={
            {
              ...combinedSliderStyle,
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
            } as React.CSSProperties
          }
          disabled={disabled}
          step={step}
        />
      );
    } else {
      return (
        <NativeSlider
          style={combinedSliderStyle}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          value={value}
          onValueChange={disabled ? undefined : onValueChange}
          onSlidingStart={disabled ? undefined : onSlidingStart}
          onSlidingComplete={disabled ? undefined : onSlidingComplete}
          minimumTrackTintColor={
            disabled ? theme.colors.outline : theme.colors.primary
          }
          maximumTrackTintColor={
            disabled ? theme.colors.outline : theme.colors.secondary
          }
          disabled={disabled}
          step={step}
        />
      );
    }
  };

  return (
    <View style={StyleSheet.flatten([defaultStyles.container, containerStyle])}>
      {label && (
        <Text style={StyleSheet.flatten([defaultStyles.label, labelStyle])}>
          {label}
        </Text>
      )}
      {renderSlider()}
      {showValue && (
        <Text
          style={StyleSheet.flatten([
            defaultStyles.valueLabel,
            valueLabelStyle,
          ])}
        >
          {valueFormatter(value)}
        </Text>
      )}
    </View>
  );
};
