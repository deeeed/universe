import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeSyntheticEvent,
  TextInput as RNGTextInput,
  StyleSheet,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { baseLogger } from '../../utils/logger';
import { SelectButtons, SelectOption } from '../SelectButtons/SelectButtons';
import { TextInput } from '../TextInput/TextInput';

type InputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'radio'
  | 'select-button'
  | 'date'
  | 'datetime'
  | 'time'
  | 'custom';

export type DynamicType =
  | string
  | number
  | SelectOption[]
  | SelectOption
  | Date;

import { en, registerTranslation } from 'react-native-paper-dates';

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
  numberOfLines?: number;
  useFlatList?: boolean;
  customRender?: (
    value: DynamicType,
    onChange: (value: DynamicType) => void
  ) => React.ReactNode;
  onFinish?: (value: DynamicType) => void;
  onCancel?: () => void;
  selectTextOnFocus?: boolean;
  finishOnEnter?: boolean;
  cancelOnEscape?: boolean;
  onChange?: (value: DynamicType) => void;
  initiallyOpen?: boolean; // New prop to control initial visibility
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
  autoFocus,
  label,
  numberOfLines,
  customRender,
  onCancel,
  onFinish,
  onChange,
  selectTextOnFocus,
  finishOnEnter,
  cancelOnEscape,
  initiallyOpen = false, // Default to false if not provided
}: DynInputProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [temp, setTemp] = useState(data);
  const inputRef = useRef<RNGTextInput>(null);
  const [visible, setVisible] = useState(initiallyOpen);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    data instanceof Date ? data : undefined
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    registerTranslation(i18n.language, en);
  }, [i18n.language]);

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
        formatedValue = value.find((option) => option.selected) as SelectOption;
      }

      setTemp(value);
      logger.debug('DynInput handleChange - value changed:', value);

      onChange?.(formatedValue);

      if (!showFooter) {
        onFinish?.(formatedValue);
      }
    },
    [multiSelect, onFinish, onChange, showFooter]
  );

  const handleFocus = () => {
    // shouldHandleKeyboardEvents.value = true;
  };

  const handleBlur = () => {
    // shouldHandleKeyboardEvents.value = false;
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (finishOnEnter && e.nativeEvent.key === 'Enter') {
      onFinish?.(temp);
    } else if (cancelOnEscape && e.nativeEvent.key === 'Escape') {
      onCancel?.();
    }
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
        selectTextOnFocus={selectTextOnFocus}
        onKeyPress={
          finishOnEnter || cancelOnEscape ? handleKeyPress : undefined
        }
        blurOnSubmit={finishOnEnter}
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
        value={temp as string}
        onChangeText={handleChange}
        selectTextOnFocus={selectTextOnFocus}
        onKeyPress={
          finishOnEnter || cancelOnEscape ? handleKeyPress : undefined
        }
        blurOnSubmit={finishOnEnter}
      />
    );
  };

  const handleDateChange = useCallback(
    (date: Date) => {
      setDatePickerVisible(false);
      const newDate = new Date(date);
      if (selectedDate) {
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      setSelectedDate(newDate);
      onFinish?.(newDate);
    },
    [selectedDate, onFinish]
  );

  const handleTimeChange = useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setTimePickerVisible(false);
      const newDate = new Date(selectedDate || Date.now());
      newDate.setHours(hours, minutes);
      setSelectedDate(newDate);
      onFinish?.(newDate);
    },
    [selectedDate, onFinish]
  );

  const renderDatePicker = () => {
    if (inputType === 'time') {
      return (
        <>
          <Button onPress={() => setVisible(true)}>
            {selectedDate ? selectedDate.toLocaleTimeString() : 'Pick time'}
          </Button>
          <TimePickerModal
            visible={visible}
            onDismiss={() => setVisible(false)}
            onConfirm={({ hours, minutes }) => {
              const newDate = new Date(selectedDate || Date.now());
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

    if (inputType === 'date') {
      return (
        <>
          <Button onPress={() => setVisible(true)}>
            {selectedDate ? selectedDate.toLocaleDateString() : 'Pick date'}
          </Button>
          <DatePickerModal
            mode="single"
            visible={visible}
            locale={'en'} // TODO: make this dynamic
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
    }

    if (inputType === 'datetime') {
      return (
        <>
          <Button onPress={() => setVisible(true)}>
            {selectedDate
              ? selectedDate.toLocaleString()
              : 'Pick date and time'}
          </Button>
          <Portal>
            <Dialog visible={visible} onDismiss={() => setVisible(false)}>
              <Dialog.Title>Select Date and Time</Dialog.Title>
              <Dialog.Content>
                <Button onPress={() => setDatePickerVisible(true)}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString()
                    : 'Pick date'}
                </Button>
                <Button onPress={() => setTimePickerVisible(true)}>
                  {selectedDate
                    ? selectedDate.toLocaleTimeString()
                    : 'Pick time'}
                </Button>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setVisible(false)}>Cancel</Button>
                <Button
                  onPress={() => {
                    setVisible(false);
                    onFinish?.(selectedDate as Date);
                  }}
                >
                  OK
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
          <DatePickerModal
            mode="single"
            visible={datePickerVisible}
            locale={'en'} // TODO: make this dynamic
            onDismiss={() => setDatePickerVisible(false)}
            date={selectedDate}
            onConfirm={(params) => {
              if (params.date) {
                handleDateChange(params.date);
              }
            }}
          />
          <TimePickerModal
            visible={timePickerVisible}
            onDismiss={() => setTimePickerVisible(false)}
            onConfirm={handleTimeChange}
            hours={selectedDate?.getHours() || 0}
            minutes={selectedDate?.getMinutes() || 0}
          />
        </>
      );
    }

    return null;
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
        {(inputType === 'date' ||
          inputType === 'time' ||
          inputType === 'datetime') &&
          renderDatePicker()}
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
