import { ScreenWrapper } from "@siteed/design-system";
import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export const Second = () => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <ScreenWrapper style={styles.container}>
      <Text>this is the text for second page</Text>
    </ScreenWrapper>
  );
};

export default Second;
