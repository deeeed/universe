import {
  AppTheme,
  Button,
  useModal,
  useTheme,
  useThemePreferences,
} from "@siteed/design-system";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

import { Form2 } from "./form2";

const getStyles = ({ theme }: { theme: AppTheme; insets: EdgeInsets }) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
    },
  });
};

export interface Form1Props {
  label: string;
  onChange?: (value: unknown) => void;
}

export const Form1 = ({ label, onChange }: Form1Props) => {
  const theme = useTheme();
  const { openDrawer, dismissAll } = useModal();
  const { toggleDarkMode } = useThemePreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets }), [theme, insets]);
  const { darkMode } = useThemePreferences();
  const handlePress = () => {
    openDrawer({
      // title: "Form 1",
      containerType: "view",
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
        footerComponent: () => {
          return (
            <View style={{ padding: 20, backgroundColor: "red" }}>
              <Text>FOOTER here</Text>
            </View>
          );
        },
      },
      render: () => {
        return (
          <View>
            <Text>Form 1</Text>
            <Form2 label="this is form 2" />
          </View>
        );
      },
    });
  };

  const handleDismiss = () => {
    dismissAll();
  };

  const handleValueChange = (newValue: unknown) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text>{label}</Text>
      <Text>
        {darkMode ? "Dark Mode" : "Light Mode"} background:{" "}
        {theme.colors.background}
      </Text>
      <Button onPress={handlePress}>Call form2</Button>
      <Button onPress={handleDismiss}>Close All</Button>
      <Button onPress={toggleDarkMode}>Toggle Dark Mode</Button>
      <Button onPress={() => handleValueChange({ someValue: "changed" })}>
        Change Value
      </Button>
    </View>
  );
};
