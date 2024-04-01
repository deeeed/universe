import { AntDesign } from "@expo/vector-icons"
import React, { useCallback, useMemo } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Chip, Text } from "react-native-paper"
import { AppTheme } from "src/hooks/use-app-theme-setup"
import { SelectOption } from "../select-buttons/select-buttons"
import { useTheme } from "src/providers/theme-provider"
import { useBottomModal } from "src/providers/custom-bottomsheet-provider"

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
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
    emptyText: {},
  })
}

export interface ItemPickerProps {
  options: SelectOption[];
  label: string;
  multi?: boolean;
  onFinish?: (selection: SelectOption[]) => void;
}
export const ItemPicker = ({
  onFinish,
  options,
  multi = false,
  label,
}: ItemPickerProps) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles(theme), [theme])
  const { editProp } = useBottomModal()

  const handlePick = useCallback(async () => {
    // pick new categories between allCategories
    const newSelection = (await editProp({
      data: options,
      multiSelect: multi,
      showFooter: true,
      min: 0,
      max: Infinity,
      showSearch: false,
      inputType: "select-button",
    })) as SelectOption[]
    onFinish?.(newSelection)
  }, [editProp, onFinish, multi, options])

  return (
    <View style={styles.container}>
      <View style={styles.leftSide}>
        <Pressable onPress={handlePick}>
          <Text style={styles.title} variant="headlineMedium">
            {label}
          </Text>
        </Pressable>
        {options.length === 0 ? (
          <Text style={styles.emptyText}>No selection</Text>
        ) : (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.scrollview}
            contentContainerStyle={styles.scrollContainer}
          >
            {options.map((category, index) => {
              if (category.selected === true) {
                return (
                  <Chip key={`cid${index}`} compact={true} mode={"flat"}>
                    {category.label}
                  </Chip>
                )
              } else return undefined
            })}
          </ScrollView>
        )}
      </View>
      <Pressable
        style={styles.actionContainer}
        onPress={handlePick}
        testID="picker-right-handle"
      >
        <AntDesign name="right" size={24} />
      </Pressable>
    </View>
  )
}
