import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput as RNGTextInput } from 'react-native-gesture-handler';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { baseLogger } from '../../utils/logger';
import { Button } from '../Button/Button';
import { SelectButtons, SelectOption } from '../SelectButtons/SelectButtons';
import { TextInput } from '../TextInput/TextInput';

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

const logger = baseLogger.extend('DynInput');

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      // flex: 1,
      // height: 100,
      // flexDirection: 'column',
      backgroundColor: theme.colors.surface,
    },
    footer: {
      // borderTopWidth: 2,
      // borderTopColor: theme.colors.outline,
      // marginBottom: 20,
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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [temp, setTemp] = useState(data);
  const inputRef = useRef<RNGTextInput>(null);

  useEffect(() => {
    setTemp(data);
    logger.log('DynInput useEffect - data changed:', data);
  }, [data, logger]);

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        // adding the timeout prevents the input focus to break sizing
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleChange = useCallback(
    (value: DynamicType) => {
      let formatedValue = value;

      if (Array.isArray(value) && value.length > 0 && !multiSelect) {
        // Return the first selected value
        formatedValue = value.find((option) => option.selected) as SelectOption;
      }

      setTemp(value);
      logger.debug('DynInput handleChange - value changed:', value);

      if (!showFooter) {
        onFinish?.(formatedValue);
      }
    },
    [multiSelect, onFinish, showFooter]
  );

  const handleFocus = () => {
    // shouldHandleKeyboardEvents.value = true;
  };

  const handleBlur = () => {
    // shouldHandleKeyboardEvents.value = false;
  };

  const renderNumber = () => {
    return (
      <TextInput
        ref={inputRef}
        inputMode="numeric"
        onFocus={handleFocus}
        onBlur={handleBlur}
        value={temp as string}
        onChangeText={handleChange}
      />
    );
  };

  const renderText = () => {
    return (
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
      <View style={{}}>
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
