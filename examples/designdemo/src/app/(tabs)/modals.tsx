// examples/designdemo/src/app/(tabs)/bottom.tsx
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Accordion,
  AccordionItemProps,
  Button,
  DynInput,
  Picker,
  useModal,
} from "@siteed/design-system";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Form1 } from "../../components/form1";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
    contentContainer: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "red",
      // minHeight: 200,
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

export const TestModals = () => {
  const styles = useMemo(() => getStyles(), []);
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const _snapPoints = useMemo(() => ["20%", "50%"], []);

  const { openDrawer, editProp, openModal } = useModal();

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
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => {
        return <Text>Drawer content</Text>;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, []);

  const renderMany = () => {
    const items = [];
    for (let i = 0; i < 100; i++) {
      items.push(<Text key={i}>Item {i}</Text>);
    }
    return items;
  };

  const accordionData: AccordionItemProps[] = [
    {
      title: "Accordion Item 1",
      children: <Text>Content 1</Text>,
    },
    {
      title: "Accordion Item 2",
      children: <View>{renderMany()}</View>,
    },
    {
      title: "Accordion Item 3",
      children: <Text>Content 3</Text>,
    },
  ];

  const handleDynamicDrawer = useCallback(async () => {
    console.log(`handleOpenDrawer`, openDrawer);
    const result = await openDrawer({
      title: "This is Title",
      render: () => {
        return <Accordion data={accordionData} />;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, [accordionData, openDrawer]);

  const handleEditProp = useCallback(async () => {
    console.log(`handleEditProp`);
    try {
      const result = await editProp({
        modalType: "modal",
        bottomSheetProps: {
          enableDynamicSizing: false,

          snapPoints: ["40%", "80%"],
          index: 0,
        },
        data: "Hello",
        inputType: "text",
      });
      console.log(`result`, result);
    } catch (error) {
      // Ignore error.
      console.log(`error`, error);
    }
  }, []);

  const handleOpenModal = useCallback(async () => {
    console.log(`handleOpenModal`, openModal);
    try {
      const result = await openModal({
        initialData: "Initial modal data",
        modalProps: {
          // You can add custom modal props here if needed
        },
        render: ({ resolve, reject }) => (
          <View>
            <Text>This is a test modal content.</Text>
            <Button onPress={() => resolve("Confirmed")}>Confirm</Button>
            <Button onPress={() => reject(new Error("Cancelled"))}>
              Cancel
            </Button>
          </View>
        ),
      });
      console.log(`handleOpenModal result`, result);
    } catch (error) {
      console.log(`error`, error);
    }
  }, [openModal]);

  const checkBug = useCallback(async () => {
    console.log(`checkBug`);
    try {
      const result = await openDrawer({
        render: () => <Form1 label="this is form 1" />,
        bottomSheetProps: {
          stackBehavior: "replace",
        },
      });
      console.log(`result`, result);
    } catch (error) {
      console.log(`error`, error);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View>
        <Picker label="Category (multi)" options={options} multi />
        <Picker label="Category" options={options} />
        <Button onPress={handleOpenDrawer}>open drawer</Button>
        <Button onPress={handleDynamicDrawer}>
          open drawer (with according inside)
        </Button>
      </View>
      <View>
        <Button onPress={handleEditProp}>Edit PRops (string)</Button>
      </View>

      <View>
        <Text>BUGs</Text>
        <Button onPress={checkBug}>BOOM Modal</Button>
      </View>

      <View>
        <Text>Within Provider</Text>
        <Button onPress={handlePresentModalPress}>Present Modal</Button>
        <BottomSheetModal
          ref={bottomSheetModalRef}
          android_keyboardInputMode="adjustResize"
          enablePanDownToClose
          backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
          // index={0}
          // snapPoints={snapPoints}
          enableDynamicSizing
          containerStyle={{ backgroundColor: "transparent" }}
          onChange={handleSheetChanges}
        >
          <BottomSheetView style={styles.contentContainer}>
            <DynInput
              data="Hello"
              inputType="text"
              autoFocus
              showFooter
              withinBottomSheet
              onCancel={() => {
                console.log("onCancel");
                bottomSheetModalRef.current?.close();
              }}
              onFinish={(value) => {
                console.log("onFinish", value);
                bottomSheetModalRef.current?.close();
              }}
            />
          </BottomSheetView>
        </BottomSheetModal>
      </View>
      <View>
        <Button onPress={handleOpenModal}>Open Modal</Button>
      </View>
    </View>
  );
};

export default TestModals;
