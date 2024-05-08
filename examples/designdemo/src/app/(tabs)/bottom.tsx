import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Button, Picker, useBottomModal } from "@siteed/design-system";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
    contentContainer: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "red",
      minHeight: 200,
    },
  });
};

const options = [
  {
    label: "Daily Sentences",
    value: "1",
    selected: true,
  },
  {
    label: "Custom Cards",
    value: "2",
  },
  {
    label: "Greetings",
    value: "3",
  },
  {
    label: "Dinings & Food",
    value: "4",
  },
  {
    label: "Shopping",
    selected: true,
    value: "5",
  },
  {
    label: "Direction & Transportation",
    value: "6",
  },
  {
    label: "Accommodation",
    value: "7",
  },
];

export interface TestBottomSheetProps {}
export const TestBottomSheet = (_: TestBottomSheetProps) => {
  const styles = useMemo(() => getStyles(), []);
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const snapPoints = useMemo(() => ["20%", "50%"], []);

  const { openDrawer } = useBottomModal();

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    console.log(`handlePresentModalPress`, bottomSheetModalRef.current);
    bottomSheetModalRef.current?.present();
    bottomSheetModalRef.current?.expand();
  }, []);
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    console.log(`handleOpenDrawer`, openDrawer);
    const result = await openDrawer({
      title: "This is Title",
      snapPoints: ["20%", "50%"],
      render: () => {
        return <Text>Drawer content</Text>;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, []);

  return (
    <View style={styles.container}>
      <View>
        <Picker label="Category (multi)" options={options} multi />
        <Picker label="Category" options={options} />
        <Button onPress={handleOpenDrawer}>open drawer</Button>
      </View>
      <View>
        <Text>Within Provider</Text>
        <Button onPress={handlePresentModalPress}>Present Modal</Button>
        <BottomSheetModal
          // enableDynamicSizing
          ref={bottomSheetModalRef}
          enablePanDownToClose
          index={0}
          snapPoints={snapPoints}
          // containerStyle={{ backgroundColor: 'transparent' }}
          onChange={handleSheetChanges}
        >
          <BottomSheetView style={styles.contentContainer}>
            <Text>Awesome 🎉</Text>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </View>
  );
};

export default TestBottomSheet;
