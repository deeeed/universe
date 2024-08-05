import { getLogger } from '@siteed/react-native-logger';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Button, HelperText, MD3Theme, Searchbar } from 'react-native-paper';
import { useScreenWidth } from '../../hooks/useScreenWidth';
import { useTheme } from '../../providers/theme-provider';
import { BREAKPOINTS } from '../select-buttons/select-buttons';

const logger = getLogger('SelectItems');

const getStyles = (theme: MD3Theme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      flexShrink: 1,
      backgroundColor: theme.colors.surface,
    },
    footer: {
      borderTopWidth: 2,
      borderTopColor: theme.colors.outline,
      marginBottom: 20,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
    },
    finishButton: {},
    cancelButton: {},
  });
};

export interface SelectItemOption<T> {
  label: string;
  item: T;
  selected?: boolean;
  order?: number;
}

export interface SelectItemsProps<T> {
  multiSelect?: boolean;
  showSearch?: boolean;
  renderItem: ({
    item,
    index,
  }: {
    item: SelectItemOption<T>;
    index: number;
    onChange?: ({
      item,
      index,
    }: {
      item: SelectItemOption<T>;
      index: number;
    }) => void;
  }) => React.ReactNode;
  showFooter?: boolean;
  min?: number; // minimum number of options that must be selected
  max?: number; // maximum number of options that can be selected
  cols?: number; // overwrite number of columns to display options in
  options: SelectItemOption<T>[];
  onFinish?: (options: SelectItemOption<T>[]) => void;
  onChange?: (options: SelectItemOption<T>[]) => void;
}

export const SelectItems = <T,>({
  options,
  min = 0,
  max, //= 1, // Infinity,
  cols,
  renderItem,
  multiSelect = false, // default value is false
  showFooter = true,
  showSearch,
  onFinish,
  onChange,
}: SelectItemsProps<T>) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentOptions, setCurrentOptions] = useState(options);
  const refInit = useRef<null | { index: number; selected: boolean }[]>(null);
  const { t } = useTranslation('select_items');

  if (refInit.current === null) {
    refInit.current = options.map((option, index) => ({
      index,
      selected: !!option.selected,
    }));
  }

  // Dynamically calculate the number of columns
  const screenWidth = useScreenWidth();

  const numColumns = useMemo(() => {
    if (cols) return cols;
    if (screenWidth >= BREAKPOINTS.LG) return 4;
    if (screenWidth >= BREAKPOINTS.MD) return 3;
    if (screenWidth >= BREAKPOINTS.SM) return 2;
    return 1;
  }, [screenWidth, cols]);

  const filteredOptions = useMemo(() => {
    return (
      currentOptions
        // Filter options based on search query
        .filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        // Sort options alphabetically
        // .sort((a, b) => a.label.localeCompare(b.label))
        // Sort options by order field
        .sort((a, b) => (a.order || 1) - (b.order || 1))
    );
  }, [currentOptions, searchQuery]);

  const handleSearchChange = useCallback(
    // () => debounce((query: string) => setSearchQuery(query), 300),
    (query: string) => setSearchQuery(query),
    []
  );

  const handleItemChange = useCallback(
    ({ index }: { item: SelectItemOption<T>; index: number }) => {
      let newOptions = [...currentOptions];
      const optionIndex = currentOptions.findIndex(
        (option) => option === filteredOptions[index]
      );

      const option = newOptions[optionIndex];
      if (typeof option !== 'undefined') {
        option.selected = !option.selected;

        // If multiSelect is false, unselect other options
        if (!multiSelect) {
          newOptions = newOptions.map((opt, idx) => ({
            ...opt,
            selected: idx === optionIndex && option.selected,
          }));
        }
      }
      setCurrentOptions(newOptions);

      logger.log('newOptions', newOptions);
      onChange?.(newOptions);
    },
    [currentOptions, filteredOptions, multiSelect, onChange, logger]
  );

  // Count of selected options
  const selectedOptionsCount = useMemo(() => {
    return currentOptions.filter((option) => option.selected).length;
  }, [currentOptions]);

  // Determine if error should be visible
  const isErrorVisible = useMemo(() => {
    return selectedOptionsCount < min || (max && selectedOptionsCount > max);
  }, [selectedOptionsCount, min, max]);

  // Error text based on min and max
  const errorText = useMemo(() => {
    if (selectedOptionsCount < min) {
      return t('min_error', { count: min });
    }
    if (max && selectedOptionsCount > max) {
      return t('max_error', { count: max });
    }
    return '';
  }, [selectedOptionsCount, min, max, t]);

  const handleRender = useCallback(
    ({ item, index }: { item: SelectItemOption<T>; index: number }) => (
      <>{renderItem({ item, index, onChange: handleItemChange })}</>
    ),
    [renderItem, handleItemChange]
  );

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS === 'web') {
        // Asserting the event as a KeyboardEvent
        const webEvent = event as unknown as React.KeyboardEvent;
        if (webEvent.code === 'Escape') {
          setSearchQuery('');
        }
      }
    },
    []
  );

  const handleCancel = useCallback(() => {
    // reset options according to refInit.current
    const newOptions = [...currentOptions];
    refInit.current?.forEach(({ index, selected }) => {
      const option = newOptions[index];
      if (option) {
        option.selected = selected;
      }
    });
    setCurrentOptions(newOptions);
    onFinish?.(options);
  }, [onFinish, currentOptions, options, refInit]);

  const handleFinish = useCallback(() => {
    refInit.current = null;
    onFinish?.(currentOptions);
  }, [onFinish, currentOptions, refInit]);

  return (
    <View style={styles.container}>
      {showSearch && (
        <Searchbar
          placeholder={t('search_placeholder')}
          clearButtonMode="while-editing"
          onChangeText={handleSearchChange}
          onKeyPress={handleKeyPress}
          value={searchQuery}
        />
      )}
      <HelperText type="error" visible={isErrorVisible || false}>
        {errorText}
      </HelperText>
      {/* Use FlatList to handle the grid layout */}
      <FlatList
        data={filteredOptions}
        renderItem={handleRender}
        keyExtractor={(_item, index) => `opt${index}`}
        numColumns={numColumns}
        key={`flatlist-${numColumns}`} // force re-render when numColumns changes
      />
      {showFooter && (
        <View style={styles.footer}>
          <Button style={styles.cancelButton} onPress={handleCancel}>
            {t('cancel')}
          </Button>
          <Button
            style={styles.finishButton}
            mode="contained"
            onPress={handleFinish}
          >
            {t('finish')}
          </Button>
        </View>
      )}
    </View>
  );
};
