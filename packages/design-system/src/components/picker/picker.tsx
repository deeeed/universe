import { AntDesign } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useModal } from '../../hooks/useModal/useModal';
import { useTheme } from '../../providers/ThemeProvider';
import { baseLogger } from '../../utils/logger';
import { ConfirmCancelFooter } from '../bottom-modal/footers/ConfirmCancelFooter';
import { PickerContent } from './PickerContent';
import { ScrollView } from 'react-native-gesture-handler';
import { SelectOption } from '../SelectButtons/SelectButtons';

const logger = baseLogger.extend('Picker');

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.padding,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      flexGrow: 1,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.gap,
      minHeight: 40, // Add a minimum height to ensure visibility
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingVertical: 8, // Add vertical padding
    },
  });
};

export interface PickerProps {
  options: SelectOption[];
  label: string;
  multi?: boolean;
  closable?: boolean;
  showFooter?: boolean;
  emptyLabel?: string;
  enableDynamicSizing?: boolean;
  showSearch?: boolean;
  fullWidthOptions?: boolean;
  onFinish?: (selection: SelectOption[]) => void;
  onItemPress?: (item: SelectOption) => void;
  emptyAction?: () => void;
  emptyOptionsTitle?: string;
  emptyOptionsMessage?: string;
  noResultsText?: string;
  emptyActionLabel?: string;
  showCreateOptionButton?: boolean;
}

export const Picker = ({
  options: initialOptions,
  label,
  multi = false,
  showSearch = false,
  fullWidthOptions = false,
  emptyLabel = 'No options available',
  emptyOptionsTitle = 'No options available',
  emptyOptionsMessage = 'No options available',
  noResultsText = 'No options available',
  emptyActionLabel = 'Create New',
  showCreateOptionButton = false,
  onFinish,
  emptyAction,
}: PickerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [activeOptions, setActiveOptions] =
    useState<SelectOption[]>(initialOptions);
  const { openDrawer } = useModal();

  useEffect(() => {
    setActiveOptions(initialOptions);
  }, [initialOptions]);

  const handlePick = useCallback(async () => {
    try {
      const result = await openDrawer<SelectOption[]>({
        title: label,
        initialData: activeOptions,
        bottomSheetProps: {
          enableDynamicSizing: true,
        },
        render: ({ state, onChange }) => (
          <PickerContent
            options={state.data}
            multi={multi}
            showSearch={showSearch}
            showDebugCreate={showCreateOptionButton}
            emptyLabel={emptyLabel}
            emptyOptionsTitle={emptyOptionsTitle}
            emptyOptionsMessage={emptyOptionsMessage}
            noResultsText={noResultsText}
            emptyActionLabel={emptyActionLabel}
            fullWidthOptions={fullWidthOptions}
            onChange={onChange}
            emptyAction={emptyAction}
          />
        ),
        renderFooter: ({ state, resolve }) => {
          if (initialOptions.length === 0 && !state.data) {
            return null;
          }

          return (
            <ConfirmCancelFooter
              onCancel={() => {
                resolve(undefined);
              }}
              onFinish={() => {
                setActiveOptions(state.data || []);
                resolve(state.data);
              }}
            />
          );
        },
      });

      if (result) {
        onFinish?.(result);
      }
    } catch (error) {
      logger.error('Error opening picker', error);
    }
  }, [
    openDrawer,
    label,
    activeOptions,
    multi,
    showSearch,
    fullWidthOptions,
    emptyAction,
    onFinish,
  ]);

  const selectedOptions = useMemo(
    () => activeOptions.filter((option) => option.selected),
    [activeOptions]
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={handlePick}>
        <Text style={styles.title} variant="headlineMedium">
          {label}
        </Text>
        <Pressable onPress={handlePick} testID="picker-right-handle">
          <AntDesign name="right" size={24} color={theme.colors.text} />
        </Pressable>
      </Pressable>
      <ScrollView
        horizontal
        contentContainerStyle={[
          styles.optionsContainer,
          styles.scrollViewContent,
        ]}
        showsHorizontalScrollIndicator={false}
      >
        {selectedOptions.length === 0 ? (
          <Text>No options selected</Text>
        ) : (
          selectedOptions.map((option) => (
            <Chip
              key={option.value}
              mode="flat"
              style={{ backgroundColor: option.color }}
            >
              {option.label}
            </Chip>
          ))
        )}
      </ScrollView>
    </View>
  );
};
