import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Searchbar, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useModal } from '../../hooks/useModal/useModal';
import { useTheme } from '../../providers/ThemeProvider';
import { ConfirmCancelFooter } from '../bottom-modal/footers/ConfirmCancelFooter';
import { Result } from '../Result/Result';
import { SelectOption } from '../SelectButtons/SelectButtons';
import { TextInput } from '../TextInput/TextInput';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.padding,
    },
    searchBar: {
      marginBottom: theme.spacing.margin,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.gap,
      minHeight: 40,
    },
    optionItem: {
      marginBottom: theme.spacing.margin,
    },
    debugCreateButton: {
      alignSelf: 'flex-end',
      marginTop: theme.spacing.margin,
    },
    createOptionContainer: {
      padding: theme.spacing.padding,
      paddingBottom: 100,
    },
    createOptionInput: {
      marginBottom: theme.spacing.margin,
    },
    createOptionButton: {
      marginTop: theme.spacing.margin,
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
  showDebugCreate?: boolean;
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
  showDebugCreate = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');

  const [tempOptions, setTempOptions] = useState(options);
  const { openDrawer } = useModal();

  const filteredOptions = useMemo(() => {
    return tempOptions.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tempOptions, searchQuery]);

  const handleSelectOption = useCallback(
    (selectedOption: SelectOption) => {
      const updatedOptions = tempOptions.map((option) =>
        option.value === selectedOption.value
          ? { ...option, selected: multi ? !option.selected : true }
          : multi
            ? option
            : { ...option, selected: false }
      );
      console.log('updatedOptions', updatedOptions);
      setTempOptions(updatedOptions);
      onChange(updatedOptions);
      onItemPress?.(selectedOption);
    },
    [tempOptions, multi, onChange, onItemPress]
  );

  const handleCreate = useCallback(async () => {
    try {
      const newOption = await openDrawer<SelectOption>({
        initialData: {
          value: `new-option-${Date.now()}`,
          label: '',
          selected: true,
        },
        title: 'Create New Option',
        render: ({ state, onChange }) => {
          const { data } = state;
          return (
            <View style={styles.createOptionContainer}>
              <TextInput
                autoFocus
                label="New Option Label"
                value={data?.label}
                onChangeText={(text) => {
                  console.log('PickerContent: handleCreate onChangeText', text);
                  onChange({ ...data, label: text });
                }}
                style={styles.createOptionInput}
              />
            </View>
          );
        },
        renderFooter: ({ state, resolve }) => {
          const { data } = state;
          return (
            <View>
              <ConfirmCancelFooter
                onCancel={() => resolve(undefined)}
                onFinish={() => resolve(data)}
              />
            </View>
          );
        },
      });

      console.log('after drawernewOption', newOption);
      if (newOption) {
        const updatedOptions = [
          ...tempOptions,
          { ...newOption, selected: true },
        ];
        setTempOptions(updatedOptions);
        onChange(updatedOptions);
      }
    } catch (error) {
      console.error('Error creating new option', error);
    }
  }, [openDrawer, tempOptions, onChange]);

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

  if (tempOptions.length === 0) {
    return (
      <View style={styles.container}>
        <Result
          status="info"
          title={emptyOptionsTitle}
          message={emptyOptionsMessage}
          buttonText={emptyActionLabel}
          onButtonPress={emptyAction}
        />
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
      {showDebugCreate && (
        <IconButton
          icon="plus"
          onPress={handleCreate}
          style={styles.debugCreateButton}
        />
      )}
    </View>
  );
};
