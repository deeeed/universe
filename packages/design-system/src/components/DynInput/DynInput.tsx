import { Portal } from '@gorhom/portal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Button, Dialog } from 'react-native-paper';
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
  initiallyOpen?: boolean; // Prevent double modals if called from editProps
  testID?: string;
}

const logger = baseLogger.extend('DynInput');

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
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
  autoFocus,
  customRender,
  onCancel,
  onFinish,
  onChange,
  selectTextOnFocus,
  finishOnEnter,
  cancelOnEscape,
  initiallyOpen = false, // Default to false if not provided
  testID,
}: DynInputProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [temp, setTemp] = useState(data);
  const [visible, setVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    data instanceof Date ? data : undefined
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [isInitialOpen, setIsInitialOpen] = useState(initiallyOpen);
  const isTextType =
    inputType === 'text' || inputType === 'textarea' || inputType === 'number';

  const { i18n } = useTranslation();

  useEffect(() => {
    registerTranslation(i18n.language, en);
  }, [i18n.language]);

  const handleChange = useCallback(
    (value: DynamicType) => {
      let formatedValue = value;

      if (Array.isArray(value) && value.length > 0 && !multiSelect) {
        formatedValue = value.find((option) => option.selected) as SelectOption;
      }

      setTemp(value);
      logger.debug('DynInput handleChange - value changed:', value);

      onChange?.(formatedValue);

      if (!showFooter && !isTextType) {
        onFinish?.(formatedValue);
      }
    },
    [multiSelect, onFinish, onChange, showFooter, isTextType]
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (finishOnEnter && e.nativeEvent.key === 'Enter') {
        onFinish?.(temp);
      } else if (cancelOnEscape && e.nativeEvent.key === 'Escape') {
        onCancel?.();
      }
    },
    [finishOnEnter, cancelOnEscape, onFinish, onCancel, temp]
  );

  const renderNumber = () => {
    return (
      <TextInput
        inputMode="numeric"
        autoFocus={autoFocus}
        value={temp as string}
        onChangeText={handleChange}
        selectTextOnFocus={selectTextOnFocus}
        onKeyPress={
          finishOnEnter || cancelOnEscape ? handleKeyPress : undefined
        }
        submitBehavior={finishOnEnter ? 'submit' : undefined}
        testID={`${testID}-number-input`}
      />
    );
  };

  const renderText = () => {
    return (
      <View testID={`${testID}-text-container`}>
        <TextInput
          multiline={!!(numberOfLines && numberOfLines > 0)}
          numberOfLines={numberOfLines}
          label={label}
          autoFocus={autoFocus}
          value={temp as string}
          onChangeText={handleChange}
          selectTextOnFocus={selectTextOnFocus}
          onKeyPress={handleKeyPress}
          submitBehavior={finishOnEnter ? 'submit' : undefined}
          testID={`${testID}-text-input`}
        />
      </View>
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

  const renderDatePicker = useCallback(() => {
    if (inputType === 'time') {
      return (
        <>
          {!visible && !isInitialOpen && (
            <Button
              onPress={() => setVisible(true)}
              testID={`${testID}-time-button`}
            >
              {selectedDate ? selectedDate.toLocaleTimeString() : 'Pick time'}
            </Button>
          )}
          <Portal hostName="modal">
            <TimePickerModal
              visible={visible || isInitialOpen}
              onDismiss={() => {
                setVisible(false);
                setIsInitialOpen(false);
                if (isInitialOpen) {
                  onFinish?.(selectedDate as Date);
                }
              }}
              onConfirm={({ hours, minutes }) => {
                const newDate = new Date(selectedDate || Date.now());
                newDate.setHours(hours, minutes);
                setSelectedDate(newDate);
                setIsInitialOpen(false);
                onFinish?.(newDate);
                setVisible(false);
              }}
              hours={selectedDate?.getHours() || 0}
              minutes={selectedDate?.getMinutes() || 0}
            />
          </Portal>
        </>
      );
    }

    if (inputType === 'date') {
      return (
        <>
          {!visible && !isInitialOpen && (
            <Button
              onPress={() => setVisible(true)}
              testID={`${testID}-date-button`}
            >
              {selectedDate ? selectedDate.toLocaleDateString() : 'Pick date'}
            </Button>
          )}
          <Portal hostName="modal">
            <DatePickerModal
              mode="single"
              visible={visible || isInitialOpen}
              locale={i18n.language}
              onDismiss={() => {
                setVisible(false);
                setIsInitialOpen(false);
                if (isInitialOpen) {
                  onFinish?.(selectedDate as Date);
                }
              }}
              date={selectedDate}
              onConfirm={(params) => {
                setVisible(false);
                setIsInitialOpen(false);
                if (params.date) {
                  setSelectedDate(params.date);
                  onFinish?.(params.date);
                }
              }}
            />
          </Portal>
        </>
      );
    }

    if (inputType === 'datetime') {
      return (
        <>
          {!visible && !isInitialOpen && (
            <Button onPress={() => setVisible(true)}>
              {selectedDate
                ? selectedDate.toLocaleString()
                : 'Pick date and time'}
            </Button>
          )}
          <Portal hostName="modal">
            <Dialog
              visible={visible || isInitialOpen}
              onDismiss={() => {
                setVisible(false);
                setIsInitialOpen(false);
                if (isInitialOpen) {
                  onFinish?.(selectedDate as Date);
                }
              }}
            >
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
                <Button
                  onPress={() => {
                    setVisible(false);
                    setIsInitialOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onPress={() => {
                    setVisible(false);
                    setIsInitialOpen(false);
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
            locale={i18n.language}
            onDismiss={() => {
              setDatePickerVisible(false);
            }}
            date={selectedDate}
            onConfirm={(params) => {
              if (params.date) {
                handleDateChange(params.date);
              }
            }}
          />
          <TimePickerModal
            visible={timePickerVisible}
            onDismiss={() => {
              setTimePickerVisible(false);
            }}
            onConfirm={handleTimeChange}
            hours={selectedDate?.getHours() || 0}
            minutes={selectedDate?.getMinutes() || 0}
          />
        </>
      );
    }

    return null;
  }, [
    visible,
    isInitialOpen,
    selectedDate,
    inputType,
    i18n.language,
    onFinish,
    handleDateChange,
    handleTimeChange,
  ]);

  const handleCancel = useCallback(() => {
    setTemp(data); // restore initial value
    onCancel?.();
  }, [data, onCancel]);

  const handleFinish = useCallback(() => {
    onFinish?.(temp);
  }, [onFinish, temp]);

  return (
    <View testID={testID}>
      {inputType === 'number' && renderNumber()}
      {(inputType === 'text' || inputType === 'textarea') && renderText()}
      {inputType === 'select-button' && (
        <SelectButtons
          multiSelect={multiSelect}
          options={temp as SelectOption[]}
          onChange={handleChange}
          min={min}
          max={max}
          showSearch={showSearch}
          testID={`${testID}-select-buttons`}
        />
      )}
      {(inputType === 'date' ||
        inputType === 'time' ||
        inputType === 'datetime') &&
        renderDatePicker()}
      {inputType === 'custom' &&
        customRender &&
        customRender(temp, handleChange)}
      {showFooter && !isInitialOpen && (
        <View style={styles.footer} testID={`${testID}-footer`}>
          <Button
            mode="contained"
            onPress={handleFinish}
            style={styles.finishButton}
            testID={`${testID}-finish-button`}
          >
            Finish
          </Button>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
            testID={`${testID}-cancel-button`}
          >
            Cancel
          </Button>
        </View>
      )}
    </View>
  );
};
