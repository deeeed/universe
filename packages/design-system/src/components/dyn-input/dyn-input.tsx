import { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { MD3Theme, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../button/Button';
import { SelectButtons, SelectOption } from '../select-buttons/select-buttons';
import { useLogger } from '@siteed/react-native-logger';

type InputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'radio'
  | 'select-button'
  | 'custom';

export type DynamicType = string | number | SelectOption[] | SelectOption;

export interface DynInputProps {
  data: DynamicType;
  inputType: InputType;
  min?: number;
  max?: number;
  multiSelect?: boolean;
  showSearch?: boolean;
  showFooter?: boolean;
  label?: string;
  numberOfLines?: number;
  useFlatList?: boolean;
  customRender?: (
    value: DynamicType,
    onChange: (value: DynamicType) => void
  ) => React.ReactNode;
  onFinish?: (value: DynamicType) => void;
  onCancel?: () => void;
}

const getStyles = (theme: MD3Theme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      // flex: 1,
      flexDirection: 'column',
      backgroundColor: theme.colors.surface,
    },
    footer: {
      borderTopWidth: 2,
      borderTopColor: theme.colors.outline,
      marginBottom: 20,
      display: 'flex',
      // alignSelf: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
    },
    finishButton: {},
    cancelButton: {},
  });
};

export const DynInput = ({
  data,
  min,
  max,
  multiSelect,
  inputType,
  showSearch,
  showFooter = true,
  label,
  numberOfLines,
  customRender,
  onCancel,
  onFinish,
}: DynInputProps) => {
  const { logger } = useLogger('DynInput');
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [temp, setTemp] = useState(data);
  const inputRef = useRef<RNTextInput>(null);
  const { shouldHandleKeyboardEvents } = useBottomSheetInternal();

  console.log(`DynInput`, data);
  useEffect(() => {
    setTemp(data);
  }, [data]);

  const handleChange = useCallback(
    (value: DynamicType) => {
      let formatedValue = value;

      if (Array.isArray(value) && value.length > 0 && !multiSelect) {
        // Return the first selected value
        formatedValue = value.find((option) => option.selected) as SelectOption;
      }

      setTemp(value);
      if (!showFooter) {
        onFinish?.(formatedValue);
      }
    },
    [multiSelect, onFinish, showFooter]
  );

  const handleFocus = () => {
    logger.debug(`handleFocus`);
    shouldHandleKeyboardEvents.value = true;
  };

  const handleBlur = () => {
    logger.debug(`handleBlur`);
    shouldHandleKeyboardEvents.value = false;
  };

  const renderNumber = () => {
    return (
      <View>
        <TextInput
          ref={inputRef}
          inputMode="numeric"
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={temp as string}
          onChangeText={handleChange}
        />
      </View>
    );
  };

  const renderText = () => {
    return (
      <View>
        <TextInput
          ref={inputRef}
          multiline={!!(numberOfLines && numberOfLines > 0)}
          numberOfLines={numberOfLines}
          label={label}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={temp as string}
          onChangeText={handleChange}
        />
      </View>
    );
  };

  const handleCancel = useCallback(() => {
    setTemp(data); // restore initial value
    onCancel?.();
  }, [data, onCancel]);

  const handleFinish = useCallback(() => {
    onFinish?.(temp);
  }, [onFinish, temp]);

  return (
    <View style={styles.container}>
      <View style={{ flexGrow: 1 }}>
        {inputType === 'text' && renderText()}
        {inputType === 'number' && renderNumber()}
        {inputType === 'custom' && customRender?.(data, handleChange)}
        {inputType === 'select-button' && (
          <SelectButtons
            // Prevent passing references to the original data
            options={JSON.parse(JSON.stringify(temp)) as SelectOption[]}
            min={min}
            max={max}
            multiSelect={multiSelect}
            showSearch={showSearch}
            onChange={handleChange}
          />
        )}
      </View>
      {showFooter && (
        <View style={styles.footer}>
          <Button
            style={styles.cancelButton}
            testID={'dyn-input-cancel'}
            onPress={handleCancel}
          >
            Cancel
          </Button>
          <Button
            style={styles.finishButton}
            testID={'dyn-input-finish'}
            mode="contained"
            onPress={handleFinish}
          >
            Done
          </Button>
        </View>
      )}
    </View>
  );
};
