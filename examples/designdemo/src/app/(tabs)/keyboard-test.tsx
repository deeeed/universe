import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Button, useTheme } from "@siteed/design-system";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Different configurations to test
type ConfigType = {
  label: string;
  keyboardBehavior: "interactive" | "extend" | "fillParent" | undefined;
  keyboardBlurBehavior?: "none" | "restore";
  android_keyboardInputMode: "adjustResize" | "adjustPan" | undefined;
  enableDynamicSizing: boolean;
  snapPoints: string[] | [];
  index?: number;
};

const TEST_CONFIGS: ConfigType[] = [
  {
    label: "Config 1: Interactive + adjustResize",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 2: Extend + adjustResize",
    keyboardBehavior: "extend",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 3: Interactive + adjustPan",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustPan",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 4: With fixed 65% height",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: false,
    snapPoints: ["65%"],
    index: 0,
  },
  {
    label: "Config 5: Default behavior",
    keyboardBehavior: undefined,
    android_keyboardInputMode: undefined,
    enableDynamicSizing: true,
    snapPoints: [],
  },
];

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    configButton: {
      marginVertical: 8,
      padding: 8,
      borderRadius: 4,
    },
    bottomSheetContent: {
      padding: 16,
    },
    directBtn: {
      marginTop: 16,
      padding: 8,
      borderRadius: 4,
      alignItems: "center",
    },
    directBtnText: {
      color: "white",
      fontWeight: "bold",
    },
    configLabel: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
    },
    infoText: {
      marginTop: 8,
      marginBottom: 16,
    },
  });
};

export const TestKeyboardBottomSheet = () => {
  const styles = useMemo(() => getStyles(), []);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [inputValue, setInputValue] = useState("Test input");
  const [activeConfig, setActiveConfig] = useState<ConfigType>(TEST_CONFIGS[0]);

  const handleOpenSheet = useCallback((config: ConfigType) => {
    setActiveConfig(config);
    bottomSheetRef.current?.present();
  }, []);

  const handleCloseSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
        Keyboard Behavior Test
      </Text>

      <Text style={styles.infoText}>
        Select a configuration to test different keyboard behaviors on Android:
      </Text>

      <ScrollView>
        {TEST_CONFIGS.map((config, index) => (
          <Button
            key={index}
            style={[
              styles.configButton,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={() => handleOpenSheet(config)}
          >
            {config.label}
          </Button>
        ))}
      </ScrollView>

      {/* Test Bottom Sheet Modal */}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={activeConfig.index || 0}
        snapPoints={activeConfig.snapPoints}
        enableDynamicSizing={activeConfig.enableDynamicSizing}
        keyboardBehavior={activeConfig.keyboardBehavior}
        keyboardBlurBehavior={activeConfig.keyboardBlurBehavior}
        android_keyboardInputMode={activeConfig.android_keyboardInputMode}
        enablePanDownToClose
        handleIndicatorStyle={{ width: 60, height: 6 }}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        topInset={insets.top}
        bottomInset={insets.bottom}
      >
        <BottomSheetView
          style={[
            styles.bottomSheetContent,
            { paddingBottom: Math.max(16, insets.bottom + 8) },
          ]}
        >
          <Text style={styles.configLabel}>{activeConfig.label}</Text>

          <Text style={{ marginBottom: 8 }}>
            keyboardBehavior: {activeConfig.keyboardBehavior}
          </Text>
          <Text style={{ marginBottom: 8 }}>
            keyboardBlurBehavior:{" "}
            {activeConfig.keyboardBlurBehavior || "undefined"}
          </Text>
          <Text style={{ marginBottom: 8 }}>
            android_keyboardInputMode: {activeConfig.android_keyboardInputMode}
          </Text>
          <Text style={{ marginBottom: 8 }}>
            enableDynamicSizing:{" "}
            {activeConfig.enableDynamicSizing ? "true" : "false"}
          </Text>
          <Text style={{ marginBottom: 16 }}>
            snapPoints: {JSON.stringify(activeConfig.snapPoints)}
          </Text>

          <BottomSheetTextInput
            placeholder="Test Input"
            value={inputValue}
            onChangeText={setInputValue}
            style={{
              marginBottom: 16,
              padding: 10,
              borderWidth: 1,
              borderColor: theme.colors.outline,
              borderRadius: 8,
              backgroundColor: theme.colors.surface,
            }}
          />

          <BottomSheetTextInput
            placeholder="Another Input"
            value={inputValue}
            onChangeText={setInputValue}
            style={{
              marginBottom: 16,
              padding: 10,
              borderWidth: 1,
              borderColor: theme.colors.outline,
              borderRadius: 8,
              backgroundColor: theme.colors.surface,
            }}
          />

          <View
            style={[styles.directBtn, { backgroundColor: theme.colors.error }]}
          >
            <Text style={styles.directBtnText} onPress={handleCloseSheet}>
              Close Modal
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default TestKeyboardBottomSheet;
