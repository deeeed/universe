import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Searchbar, Text } from 'react-native-paper';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { SelectOption } from './Picker';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.padding,
    },
    searchBar: {
      marginBottom: theme.spacing.margin,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.gap,
    },
    optionItem: {
      marginBottom: theme.spacing.margin,
    },
  });
};

interface PickerContentProps {
  options: SelectOption[];
  multi: boolean;
  showSearch: boolean;
  fullWidthOptions: boolean;
  emptyLabel: string;
  emptyAction?: () => void;
  emptyOptionsTitle: string;
  emptyOptionsMessage: string;
  noResultsText: string;
  emptyActionLabel: string;
  onChange: (options: SelectOption[]) => void;
  onItemPress?: (item: SelectOption) => void;
}

export const PickerContent: React.FC<PickerContentProps> = ({
  options,
  multi,
  showSearch,
  fullWidthOptions,
  emptyAction,
  emptyOptionsTitle,
  emptyOptionsMessage,
  emptyActionLabel,
  noResultsText,
  onChange,
  onItemPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleSelectOption = useCallback(
    (selectedOption: SelectOption) => {
      const updatedOptions = options.map((option) =>
        option.value === selectedOption.value
          ? { ...option, selected: multi ? !option.selected : true }
          : multi
            ? option
            : { ...option, selected: false }
      );
      onChange(updatedOptions);
      onItemPress?.(selectedOption);
    },
    [options, multi, onChange, onItemPress]
  );

  const renderOptions = useCallback(() => {
    return (
      <View style={styles.optionsContainer}>
        {filteredOptions.map((option) => (
          <View
            key={option.value}
            style={[styles.optionItem, fullWidthOptions && { width: '100%' }]}
          >
            <Chip
              mode={option.selected ? 'flat' : 'outlined'}
              selected={option.selected}
              onPress={() => handleSelectOption(option)}
              style={fullWidthOptions ? { width: '100%' } : {}}
            >
              {option.label}
            </Chip>
          </View>
        ))}
      </View>
    );
  }, [filteredOptions, styles, fullWidthOptions, handleSelectOption]);

  if (options.length === 0) {
    return (
      <View style={styles.container}>
        <Text>{emptyOptionsTitle}</Text>
        <Text>{emptyOptionsMessage}</Text>
        {emptyAction && <Chip onPress={emptyAction}>{emptyActionLabel}</Chip>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showSearch && (
        <Searchbar
          placeholder="Search options"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      )}
      {filteredOptions.length === 0 ? (
        <Text>{noResultsText}</Text>
      ) : (
        renderOptions()
      )}
    </View>
  );
};
