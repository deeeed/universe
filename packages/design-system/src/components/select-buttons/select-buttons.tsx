import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInputKeyPressEventData,
  View,
} from "react-native"
import { Button, HelperText, MD3Theme, Searchbar } from "react-native-paper"
import { useScreenWidth } from "../../hooks/use-screen-width"
import { FlatList } from "react-native-gesture-handler"
import { useTheme } from "../../providers/theme-provider"

const getStyles = (theme: MD3Theme) => {
  return StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      backgroundColor: theme.colors.surface,
    },
    buttonContainer: { flex: 1, padding: 8 },
    button: {},
    buttonSelected: {
      backgroundColor: theme.colors.secondaryContainer,
      color: theme.colors.secondary,
    },
  })
}

export interface SelectOption {
  label: string;
  value: string;
  order?: number;
  color?: string;
  selected?: boolean;
}

export interface SelectButtonsProps {
  multiSelect?: boolean;
  showSearch?: boolean;
  min?: number; // minimum number of options that must be selected
  max?: number; // maximum number of options that can be selected
  cols?: number; // overwrite number of columns to display options in
  onChange?: (options: SelectOption[]) => void;
  options: SelectOption[];
}

export const BREAKPOINTS = {
  SM: 600,
  MD: 900,
  LG: 1200,
}

export const SelectButtons = ({
  options,
  min = 0,
  max, //= 1, // Infinity,
  cols,
  multiSelect = false, // default value is false
  onChange,
  showSearch,
}: SelectButtonsProps) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentOptions, setCurrentOptions] = useState(options || [])

  // Dynamically calculate the number of columns
  const screenWidth = useScreenWidth()

  const numColumns = useMemo(() => {
    if (cols) return cols
    if (screenWidth >= BREAKPOINTS.LG) return 4
    if (screenWidth >= BREAKPOINTS.MD) return 3
    if (screenWidth >= BREAKPOINTS.SM) return 2
    return 1
  }, [screenWidth, cols])

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
    )
  }, [currentOptions, searchQuery])

  useEffect(() => {
    setCurrentOptions(options)
  }, [options])

  const handleSearchChange = useCallback(
    // () => debounce((query: string) => setSearchQuery(query), 300),
    (query: string) => setSearchQuery(query),
    []
  )

  const handleButtonPress = useCallback(
    (index: number) => {
      let newOptions = [...currentOptions]
      const optionIndex = currentOptions.findIndex(
        (option) => option === filteredOptions[index]
      )

      const option = newOptions[optionIndex]
      if (typeof option !== "undefined") {
        option.selected = !option.selected

        // If multiSelect is false, unselect other options
        if (!multiSelect) {
          newOptions = newOptions.map((opt, idx) => ({
            ...opt,
            selected: idx === optionIndex && option.selected,
          }))
        }
      } else {
        throw new Error("Option is undefined")
      }

      onChange?.(newOptions)
    },
    [currentOptions, filteredOptions, onChange, multiSelect]
  )

  // Count of selected options
  const selectedOptionsCount = useMemo(() => {
    return currentOptions.filter((option) => option.selected).length
  }, [currentOptions])

  // Determine if error should be visible
  const isErrorVisible = useMemo(() => {
    return selectedOptionsCount < min || (max && selectedOptionsCount > max)
  }, [selectedOptionsCount, min, max])

  // Error text based on min and max
  const errorText = useMemo(() => {
    if (selectedOptionsCount < min) {
      return `Please select at least ${min} option(s).`
    }
    if (max && selectedOptionsCount > max) {
      return `Please select no more than ${max} option(s).`
    }
    return ""
  }, [selectedOptionsCount, min, max])

  // Render a single button
  const renderButton = useCallback(
    ({ item, index }: { item: SelectOption; index: number }) => (
      <View style={styles.buttonContainer}>
        {/* Add padding here */}
        <Button
          key={`opt${index}`}
          testID={`buttons-opt-${index}`}
          style={[styles.button, item.selected && styles.buttonSelected]}
          onPress={() => handleButtonPress(index)}
        >
          {item.label}
        </Button>
      </View>
    ),
    [handleButtonPress, styles]
  )

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS === "web") {
        // Asserting the event as a KeyboardEvent
        const webEvent = event as unknown as React.KeyboardEvent
        if (webEvent.code === "Escape") {
          setSearchQuery("")
        }
      }
    },
    []
  )

  return (
    <View style={styles.container}>
      {showSearch && (
        <Searchbar
          placeholder="Search"
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
        renderItem={renderButton}
        keyExtractor={(_item, index) => `opt${index}`}
        numColumns={numColumns}
        key={`flatlist-${numColumns}`} // force re-render when numColumns changes
      />
    </View>
  )
}
