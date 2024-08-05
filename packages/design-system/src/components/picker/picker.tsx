// packages/design-system/src/components/picker/picker.tsx
import { AntDesign } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/useAppThemeSetup';
import { useTheme } from '../../providers/theme-provider';
import { SelectOption } from '../select-buttons/select-buttons';
import { useBottomModal } from '../../hooks/useBottomModal';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    leftSide: {
      flexGrow: 1,
      flexShrink: 1,
    },
    actionContainer: {
      padding: 10,
    },
    scrollview: {
      flexGrow: 1,
      // width: 200,
      flexShrink: 1,
    },
    scrollContainer: {
      gap: 10,
      padding: 10,
    },
    title: {},
    emptyText: {
      padding: 10,
      color: theme.colors.scrim,
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
  onFinish?: (selection: SelectOption[]) => void;
  onItemPress?: (item: SelectOption) => void;
}
export const Picker = ({
  onFinish,
  onItemPress,
  options,
  multi = false,
  closable = false,
  showFooter = false,
  emptyLabel = 'No selection',
  label,
}: PickerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { editProp } = useBottomModal();
  const [activeOptions, setActiveOptions] = useState<SelectOption[]>(options);
  const selectedOptions = activeOptions.filter((option) => option.selected);

  useEffect(() => {
    setActiveOptions(options);
  }, [options]);

  const handlePick = useCallback(async () => {
    if (!activeOptions || activeOptions.length === 0) {
      return;
    }
    // pick new categories between allCategories
    let newSelection = (await editProp({
      data: activeOptions,
      multiSelect: multi,
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      min: 0,
      max: Infinity,
      showFooter: !multi ? showFooter : true,
      showSearch: false,
      inputType: 'select-button',
    })) as SelectOption[] | SelectOption;
    // if the user selected only one category, we need to convert it to an array
    if (typeof newSelection === 'object' && !Array.isArray(newSelection)) {
      newSelection = [newSelection];
    }
    onFinish?.(newSelection);
  }, [editProp, onFinish, multi, activeOptions]);

  const handleItemPress = useCallback(
    async (item: SelectOption) => {
      if (onItemPress) {
        onItemPress(item);
      } else {
        handlePick();
      }
    },
    [onItemPress, handlePick]
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftSide}>
        <Pressable onPress={handlePick}>
          <Text style={styles.title} variant="headlineMedium">
            {label}
          </Text>
        </Pressable>
        {selectedOptions.length === 0 ? (
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        ) : (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.scrollview}
            contentContainerStyle={styles.scrollContainer}
          >
            {selectedOptions.map((category, index) => {
              return (
                <Chip
                  key={`cid${index}`}
                  style={{ backgroundColor: category.color }}
                  compact={true}
                  onPress={() => handleItemPress(category)}
                  onClose={
                    closable
                      ? () => {
                          setActiveOptions((prev) =>
                            prev.map((c) =>
                              c.value === category.value
                                ? { ...c, selected: false }
                                : c
                            )
                          );
                        }
                      : undefined
                  }
                  mode={'flat'}
                >
                  {category.label}
                </Chip>
              );
            })}
          </ScrollView>
        )}
      </View>
      {activeOptions.length > 0 && (
        <Pressable
          style={styles.actionContainer}
          onPress={handlePick}
          testID="picker-right-handle"
        >
          <AntDesign name="right" size={24} />
        </Pressable>
      )}
    </View>
  );
};
