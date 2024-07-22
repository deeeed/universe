import { AntDesign } from "@expo/vector-icons";
import {
  useBottomModal,
  useTheme,
  type AppTheme,
  type SelectOption,
} from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

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
    emptyText: {
      padding: 10,
    },
  });
};

export interface PickSpeakersProps {
  options: SelectOption[];
  label: string;
  loading?: boolean;
  multi?: boolean;
  onFinish?: (selection: SelectOption[]) => void;
}
export const PickSpeakers = ({
  onFinish,
  options,
  loading = false,
  multi = false,
  label,
}: PickSpeakersProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { editProp, bottomSheetModalRef } = useBottomModal();
  const { logger } = useLogger("PickSpeakers");
  const [activeOptions, setActiveOptions] = useState<SelectOption[]>(options);
  const selectedOptions = activeOptions.filter((option) => option.selected);

  useEffect(() => {
    setActiveOptions(options);
  }, [options]);

  const handlePick = useCallback(async () => {
    // pick new categories between allCategories
    logger.debug(`PickSpeakers: handlePick`);
    try {
      const newSelection = (await editProp({
        data: activeOptions,
        multiSelect: multi,
        bottomSheetProps: {
          enableDynamicSizing: true,
          // snapPoints: ["50%", "90%"],
        },
        showFooter: true,
        useFlatList: false,
        min: 0,
        max: Number.POSITIVE_INFINITY,
        showSearch: false,
        inputType: "select-button",
      })) as SelectOption[];
      logger.info(`PickSpeakers: handlePick newSelection`, newSelection);
      onFinish?.(newSelection);
    } catch (error) {
      logger.error(`PickSpeakers: handlePick error`, error);
    }
  }, [editProp, onFinish, multi, logger, activeOptions]);

  return (
    <View style={styles.container}>
      <View style={styles.leftSide}>
        <Pressable onPress={handlePick}>
          <Text style={styles.title} variant="headlineMedium">
            {label}
          </Text>
        </Pressable>
        {selectedOptions.length === 0 ? (
          <Text style={styles.emptyText}>No selection</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollview}
            contentContainerStyle={styles.scrollContainer}
          >
            {selectedOptions.map((category, index) => {
              if (category.selected === true) {
                return (
                  <Chip
                    key={`cid${index}`}
                    compact
                    mode="flat"
                    onClose={() => {
                      setActiveOptions((prev) =>
                        prev.map((c) =>
                          c.value === category.value
                            ? { ...c, selected: false }
                            : c,
                        ),
                      );
                    }}
                  >
                    {category.label}
                  </Chip>
                );
              } else return undefined;
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
