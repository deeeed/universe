import { AntDesign } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { Result } from '../Result/Result';
import { SelectOption } from '../SelectButtons/SelectButtons';
import { ConfirmCancelFooter } from '../bottom-modal/footers/ConfirmCancelFooter';
import { LabelHandler } from '../bottom-modal/handlers/LabelHandler';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.padding,
    },
    leftSide: {
      flexGrow: 1,
      flexShrink: 1,
    },
    scrollview: {
      flexGrow: 1,
      flexShrink: 1,
    },
    scrollContainer: {
      gap: theme.spacing.gap,
      padding: theme.spacing.padding,
    },
    title: {},
    emptyText: {
      padding: theme.spacing.padding,
      color: theme.colors.scrim,
    },
    modalHeader: {
      padding: theme.spacing.padding,
    },
    modalContent: {
      flex: 1,
      padding: theme.spacing.padding,
    },
    scrollViewContent: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.padding,
      paddingBottom: 80, // Add padding to the bottom to prevent overlap with footer
    },
    optionItem: {},
    searchInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 5,
      padding: theme.spacing.padding,
      marginBottom: theme.spacing.margin,
    },
    optionItemsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.gap,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.padding,
    },
    noResultsText: {
      textAlign: 'center',
      marginTop: theme.spacing.margin,
      marginBottom: theme.spacing.margin,
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
}

export const Picker = ({
  onFinish,
  onItemPress,
  options,
  multi = false,
  closable = false,
  showFooter = true,
  showSearch = false,
  fullWidthOptions = true,
  emptyLabel = 'No selection',
  label,
  emptyAction,
  emptyOptionsTitle = 'No Options',
  emptyOptionsMessage = "You don't have any options yet",
  noResultsText = 'No options match your search',
  emptyActionLabel = 'Create New',
}: PickerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [activeOptions, setActiveOptions] = useState<SelectOption[]>(options);
  const [tempOptions, setTempOptions] = useState<SelectOption[]>(options);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOptions = activeOptions.filter((option) => option.selected);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    setActiveOptions(options);
    setTempOptions(options);
  }, [options]);

  const filteredOptions = useMemo(() => {
    return tempOptions.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tempOptions, searchQuery]);

  const handlePick = useCallback(() => {
    setTempOptions(activeOptions);
    setSearchQuery('');
    bottomSheetModalRef.current?.present();
  }, [activeOptions]);

  const handleClose = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const handleSelectOption = useCallback(
    (option: SelectOption) => {
      setTempOptions((prev) =>
        prev.map((o) =>
          o.value === option.value
            ? { ...o, selected: multi ? !o.selected : true }
            : multi
              ? o
              : { ...o, selected: false }
        )
      );
    },
    [multi]
  );

  const handleConfirm = useCallback(() => {
    setActiveOptions(tempOptions);
    onFinish?.(tempOptions.filter((o) => o.selected));
    handleClose();
  }, [onFinish, tempOptions, handleClose]);

  const handleCancel = useCallback(() => {
    setTempOptions(activeOptions);
    handleClose();
  }, [activeOptions, handleClose]);

  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => {
    return (
      <BottomSheetBackdrop
        {...props}
        pressBehavior={'close'}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    );
  }, []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <ConfirmCancelFooter
        {...props}
        onCancel={handleCancel}
        onFinish={handleConfirm}
      />
    ),
    [handleCancel, handleConfirm]
  );

  const renderOptions = useCallback(() => {
    return (
      <View style={styles.optionItemsContainer}>
        {filteredOptions.map((item) => (
          <View
            key={item.value}
            style={[styles.optionItem, fullWidthOptions && { width: '100%' }]}
          >
            <Chip
              mode={item.selected ? 'flat' : 'outlined'}
              selected={item.selected}
              onPress={() => handleSelectOption(item)}
              style={fullWidthOptions ? { width: '100%' } : {}}
            >
              {item.label}
            </Chip>
          </View>
        ))}
      </View>
    );
  }, [
    filteredOptions,
    styles.optionItem,
    styles.emptyStateContainer,
    handleSelectOption,
    emptyAction,
    emptyActionLabel,
    fullWidthOptions,
  ]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.modalHeader}>
        {showSearch && (
          <BottomSheetTextInput
            style={styles.searchInput}
            placeholder="Filter..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        )}
      </View>
    ),
    [styles.modalHeader, styles.searchInput, showSearch, searchQuery]
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
          <Pressable onPress={handlePick}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.scrollview}
              contentContainerStyle={styles.scrollContainer}
            >
              {selectedOptions.map((option, index) => (
                <Chip
                  key={`option-${index}`}
                  style={{ backgroundColor: option.color }}
                  compact={true}
                  onPress={(event) => {
                    event.stopPropagation();
                    if (onItemPress) {
                      onItemPress?.(option);
                    } else {
                      handlePick();
                    }
                  }}
                  onClose={
                    closable
                      ? () => {
                          setActiveOptions((prev) =>
                            prev.map((o) =>
                              o.value === option.value
                                ? { ...o, selected: false }
                                : o
                            )
                          );
                        }
                      : undefined
                  }
                  mode={'flat'}
                >
                  {option.label}
                </Chip>
              ))}
            </ScrollView>
          </Pressable>
        )}
      </View>
      {activeOptions.length > 0 && (
        <Pressable onPress={handlePick} testID="picker-right-handle">
          <AntDesign name="right" size={24} color={theme.colors.text} />
        </Pressable>
      )}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        enableDynamicSizing
        enableDismissOnClose
        backdropComponent={renderBackdrop}
        handleComponent={(props) => <LabelHandler {...props} />}
        footerComponent={
          showFooter && tempOptions.length > 0 ? renderFooter : undefined
        }
      >
        <BottomSheetScrollView contentContainerStyle={styles.scrollViewContent}>
          {renderHeader()}
          {tempOptions.length === 0 ? (
            <Result
              status="warning"
              title={emptyOptionsTitle}
              message={emptyOptionsMessage}
              buttonText={emptyActionLabel}
              onButtonPress={() => {
                emptyAction?.();
                handleClose();
              }}
            />
          ) : filteredOptions.length === 0 ? (
            <Text style={styles.noResultsText}>{noResultsText}</Text>
          ) : (
            renderOptions()
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
};
