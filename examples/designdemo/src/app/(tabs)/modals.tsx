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
  EditPropProps,
  TextInput,
  ThemeConfig,
  useModal,
  useThemePreferences,
  useToast,
} from "@siteed/design-system";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ExpoRouterUIWrapper } from "../components/ExpoRouterUIWrapper";

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

interface Test {
  name: string;
}

export const TestModals = () => {
  const styles = useMemo(() => getStyles(), []);
  const { show } = useToast();
  const { toggleDarkMode, theme } = useThemePreferences();
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const _snapPoints = useMemo(() => ["20%", "50%"], []);

  const { openDrawer, editProp, openModal } = useModal();

  const [test, setTest] = useState<Test>({ name: "test" });

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    console.log(`handlePresentModalPress`, bottomSheetModalRef.current);
    bottomSheetModalRef.current?.present();
    bottomSheetModalRef.current?.expand();
  }, []);
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
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
      footerType: "confirm_cancel",
      containerType: "scrollview",
      render: () => {
        return <Accordion data={accordionData} />;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, [accordionData, openDrawer]);

  const handleEditProp = useCallback(
    async ({ modalType }: { modalType: EditPropProps["modalType"] }) => {
      console.log(`handleEditProp`);
      try {
        const result = await editProp({
          modalType,
          autoFocus: true,
          bottomSheetProps: {
            // enableDynamicSizing: true,
            // snapPoints: ["40%", "80%"],
            // index: 0,
          },
          data: "Hello",
          inputType: "text",
        });
        console.log(`result`, result);
      } catch (error) {
        // Ignore error.
        console.log(`error`, error);
      }
    },
    [],
  );

  const handleOpenModal = useCallback(async () => {
    console.log(`handleOpenModal`, openModal);
    try {
      const result = await openModal({
        initialData: "Initial modal data",
        modalProps: {
          showBackdrop: true,
          // You can add custom modal props here if needed
        },
        render: ({ resolve, reject }) => (
          <View>
            <Text>This is a test modal content.</Text>
            <Text>Theme: {theme.dark ? "Dark" : "Light"}</Text>
            <Button
              onPress={() =>
                show({
                  message: "This is a toast message",
                  type: "success",
                })
              }
            >
              show toast
            </Button>
            <Button
              onPress={() => {
                toggleDarkMode();
              }}
            >
              Toggle DarkMode
            </Button>
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
  }, [openModal, toggleDarkMode, show, theme]);

  const checkBug = useCallback(async () => {
    console.log(`checkBug`);
    try {
      const result = await openDrawer<Test>({
        initialData: test,
        render: ({ data, onChange }) => (
          <View>
            <Text>Name: {data.name}</Text>
            <TextInput
              label="Name"
              value={data.name}
              onChangeText={(text) => {
                onChange({ ...data, name: text });
              }}
            />
          </View>
        ),
        bottomSheetProps: {
          stackBehavior: "replace",
        },
      });
      console.log(`result`, result);
      if (result) {
        setTest(result);
      }
    } catch (error) {
      console.log(`error`, error);
    }
  }, [test, openDrawer]);

  return (
    <View style={styles.container}>
      <ThemeConfig colors={[]} />
      <View>
        <Button onPress={handleDynamicDrawer}>
          open drawer (with according inside)
        </Button>
      </View>
      <View style={{ backgroundColor: theme.colors.surfaceVariant }}>
        <Button onPress={() => handleEditProp({ modalType: "modal" })}>
          Edit PRops Modal (string)
        </Button>
        <Button onPress={() => handleEditProp({ modalType: "drawer" })}>
          Edit PRops Drawer (string)
        </Button>
      </View>
      <View style={{ backgroundColor: theme.colors.secondaryContainer }}>
        <Text>Test: {JSON.stringify(test)}</Text>
        <Button onPress={checkBug}>Check onChange Event</Button>
      </View>

      <View style={{ backgroundColor: theme.colors.tertiaryContainer }}>
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

export default function ModalsScreenWrapper() {
  return (
    <ExpoRouterUIWrapper>
      <TestModals />
    </ExpoRouterUIWrapper>
  );
}
