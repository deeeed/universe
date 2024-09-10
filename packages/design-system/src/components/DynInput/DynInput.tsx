import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { StyleSheet, TextInput as RNGTextInput } from 'react-native';
import { baseLogger } from '../../utils/logger';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { SelectButtons, SelectOption } from '../SelectButtons/SelectButtons';
import { TextInput } from '../TextInput/TextInput';
import { useTranslation } from 'react-i18next';

type InputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'radio'
  | 'select-button'
  | 'date'
  | 'custom';

export type DynamicType =
  | string
  | number
  | SelectOption[]
  | SelectOption
  | Date;

export interface DynInputProps {
  data: DynamicType;
  inputType: InputType;
  min?: number;
  max?: number;
  multiSelect?: boolean;
  showSearch?: boolean;
  showFooter?: boolean;
  autoFocus?: boolean;
  label?: string;
  withinBottomSheet?: boolean;
  numberOfLines?: number;
  useFlatList?: boolean;
  customRender?: (
    value: DynamicType,
    onChange: (value: DynamicType) => void
  ) => React.ReactNode;
  onFinish?: (value: DynamicType) => void;
  onCancel?: () => void;
  dateMode?: 'date' | 'time' | 'datetime';
}

const logger = baseLogger.extend('DynInput');

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      width: '100%',
      backgroundColor: theme.colors.surface,
    },
    footer: {
      display: 'flex',
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
  withinBottomSheet = false,
  autoFocus,
  label,
  numberOfLines,
  customRender,
  onCancel,
  onFinish,
  dateMode = 'date',
}: DynInputProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [temp, setTemp] = useState(data);
  const inputRef = useRef<RNGTextInput>(null);
  const [visible, setVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    data as Date
  );
  const { i18n } = useTranslation();

  useEffect(() => {
    setTemp(data);
    logger.log('DynInput useEffect - data changed:', data);
  }, [data, logger]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (inputRef.current && autoFocus) {
      timeout = setTimeout(() => {
        // adding the timeout prevents the input focus to break sizing
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }

    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [autoFocus]);

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
        withinBottomSheet={withinBottomSheet}
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
        withinBottomSheet={withinBottomSheet}
        value={temp as string}
        onChangeText={handleChange}
      />
    );
  };

  const renderDatePicker = () => {
    if (dateMode === 'time') {
      return (
        <>
          <Button onPress={() => setVisible(true)}>
            {selectedDate ? selectedDate.toLocaleTimeString() : 'Pick time'}
          </Button>
          <TimePickerModal
            visible={visible}
            onDismiss={() => setVisible(false)}
            onConfirm={({ hours, minutes }) => {
              const newDate = new Date();
              newDate.setHours(hours, minutes);
              setSelectedDate(newDate);
              onFinish?.(newDate);
              setVisible(false);
            }}
            hours={selectedDate?.getHours() || 0}
            minutes={selectedDate?.getMinutes() || 0}
          />
        </>
      );
    }

    return (
      <>
        <Button onPress={() => setVisible(true)}>
          {selectedDate ? selectedDate.toLocaleDateString() : 'Pick date'}
        </Button>
        <DatePickerModal
          mode="single"
          visible={visible}
          locale={i18n.language}
          onDismiss={() => setVisible(false)}
          date={selectedDate}
          onConfirm={(params) => {
            setVisible(false);
            if (params.date) {
              setSelectedDate(params.date);
              onFinish?.(params.date);
            }
          }}
        />
      </>
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
        {inputType === 'date' && renderDatePicker()}
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
