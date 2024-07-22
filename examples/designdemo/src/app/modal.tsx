import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export default function ModalScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const handleSnapPress = useCallback((index: number) => {
    bottomSheetRef.current?.snapToIndex(index);
  }, []);
  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);
  const handleCollapsePress = useCallback(() => {
    bottomSheetRef.current?.collapse();
  }, []);
  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      <Button onPress={() => handleSnapPress(2)}>Snap To 90%</Button>
      <Button onPress={() => handleSnapPress(1)}>Snap To 50%</Button>
      <Button onPress={() => handleSnapPress(0)}>Snap To 25%</Button>
      <Button onPress={() => handleExpandPress()}>Expand</Button>
      <Button onPress={() => handleCollapsePress()}>Collapse</Button>
      <Button onPress={() => handleClosePress()}>Close</Button>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        animateOnMount
        onChange={handleSheetChanges}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text>Awesome 🎉</Text>
          <Button onPress={() => bottomSheetRef.current?.close()}>Close</Button>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
