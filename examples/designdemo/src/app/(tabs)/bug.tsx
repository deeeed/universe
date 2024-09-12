import {
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

import { Form1 } from "../../components/form1";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export const Bug = () => {
  const styles = useMemo(() => getStyles(), []);
  const { theme } = useThemePreferences();
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
  ];

  const { openDrawer } = useModal();

  return (
    <View style={styles.container}>
      <ThemeConfig colors={colors} />
      {/* <Form1 label="Form 1" /> */}
      <Button
        onPress={() => {
          openDrawer({
            bottomSheetProps: {
              index: 0,
            },
            render: () => <Form1 label="Form 1" />,
          });
        }}
      >
        Open
      </Button>
    </View>
  );
};

export default Bug;
