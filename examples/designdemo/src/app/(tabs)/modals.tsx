// examples/designdemo/src/app/(tabs)/bottom.tsx
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import {
  Accordion,
  AccordionItemProps,
  Button,
  EditPropProps,
  TextInput,
  ThemeConfig,
  useModal,
  useTheme,
  useThemePreferences,
  useToast,
} from "@siteed/design-system";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      width: "100%",
      alignItems: "center",
      padding: 16,
    },
    bottomSheetContent: {
      padding: 16,
    },
    directBtn: {
      marginTop: 16,
      padding: 8,
      backgroundColor: "#2196F3",
      borderRadius: 4,
      alignItems: "center",
    },
    directBtnText: {
      color: "white",
      fontWeight: "bold",
    },
  });
};

interface Test {
  name: string;
}

export const TestModals = () => {
  const styles = useMemo(() => getStyles(), []);
  const { show } = useToast();
  const { toggleDarkMode } = useThemePreferences();
  const theme = useTheme();

  // variables
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const nestedBottomSheetRef = useRef<BottomSheetModal>(null);

  const { openDrawer, editProp, openModal } = useModal();

  const [test, setTest] = useState<Test>({ name: "test" });
  const [directInputValue, setDirectInputValue] = useState("test");
  const [nestedValue, setNestedValue] = useState("nested value");

  // Add a minimal set of snap points
  const snapPoints = useMemo(() => [], []);

  // Direct bottom sheet handlers
  const handlePresentDirectModal = useCallback(() => {
    console.log("Opening direct bottom sheet modal");
    bottomSheetModalRef.current?.present();
  }, []);

  const handleCloseDirectModal = useCallback(() => {
    bottomSheetModalRef.current?.close();
  }, []);

  const handleSaveDirectModal = useCallback(() => {
    setTest({ name: directInputValue });
    bottomSheetModalRef.current?.close();
  }, [directInputValue]);

  // Set direct input value when test changes
  useEffect(() => {
    setDirectInputValue(test.name);
  }, [test]);

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
          modalProps: {
            closeOnOutsideTouch: true,
            showBackdrop: true,
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
        render: ({ resolve, reject }) => (
          <ModalContent resolve={resolve} reject={reject} />
        ),
      });
      console.log(`handleOpenModal result`, result);
    } catch (error) {
      console.log(`error`, error);
    }
  }, [openModal, show, toggleDarkMode]);

  const checkBug = useCallback(async () => {
    console.log(`checkBug`);
    try {
      const result = await openDrawer<Test>({
        initialData: test,
        render: ({ state, onChange }) => {
          const { data } = state;
          return (
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
          );
        },
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

  // Add handlers for the nested sheet
  const handleOpenNestedSheet = useCallback(() => {
    console.log("Opening nested bottom sheet");
    nestedBottomSheetRef.current?.present();
  }, []);

  const handleCloseNestedSheet = useCallback(() => {
    nestedBottomSheetRef.current?.close();
  }, []);

  const handleUpdateFromNested = useCallback((newValue: string) => {
    setDirectInputValue(newValue);
    nestedBottomSheetRef.current?.close();
  }, []);

  return (
    <View>
      <ThemeConfig colors={[]} />
      <Text>Modals: darkMode: {theme.dark ? "true" : "false"}</Text>
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
      <View>
        <Button onPress={handleOpenModal}>Open Modal</Button>
      </View>

      {/* New Button for Direct Bottom Sheet */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "bold" }}>
          Direct Bottom Sheet (bypass useModal)
        </Text>
        <Button onPress={handlePresentDirectModal}>
          Open Direct Bottom Sheet
        </Button>
      </View>

      {/* Direct Bottom Sheet Modal */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
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
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            Edit Name (Direct Modal)
          </Text>
          <Text>Current Name: {directInputValue}</Text>
          <Text>{JSON.stringify(snapPoints)}</Text>
          <TextInput
            label="Name"
            value={directInputValue}
            onChangeText={setDirectInputValue}
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          {/* Button to open nested sheet */}
          <View
            style={[
              styles.directBtn,
              { backgroundColor: theme.colors.secondary, marginBottom: 16 },
            ]}
          >
            <Text style={styles.directBtnText} onPress={handleOpenNestedSheet}>
              Open Nested Sheet
            </Text>
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={[
                styles.directBtn,
                { backgroundColor: theme.colors.error },
              ]}
            >
              <Text
                style={styles.directBtnText}
                onPress={handleCloseDirectModal}
              >
                Cancel
              </Text>
            </View>
            <View style={styles.directBtn}>
              <Text
                style={styles.directBtnText}
                onPress={handleSaveDirectModal}
              >
                Save
              </Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Nested Bottom Sheet Modal */}
      <BottomSheetModal
        ref={nestedBottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
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
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            Nested Sheet
          </Text>
          <Text>Value from parent: {directInputValue}</Text>
          <TextInput
            label="Modified Value"
            value={nestedValue}
            onChangeText={setNestedValue}
            style={{ marginTop: 8, marginBottom: 16 }}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={[
                styles.directBtn,
                { backgroundColor: theme.colors.error },
              ]}
            >
              <Text
                style={styles.directBtnText}
                onPress={handleCloseNestedSheet}
              >
                Cancel
              </Text>
            </View>
            <View style={styles.directBtn}>
              <Text
                style={styles.directBtnText}
                onPress={() => handleUpdateFromNested(nestedValue)}
              >
                Update Parent
              </Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

const ModalContent: React.FC<{
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}> = ({ resolve, reject }) => {
  const theme = useTheme();
  const { show } = useToast();
  const { toggleDarkMode } = useThemePreferences();
  const [trigger, setTrigger] = useState(1);

  const handleToggleDarkMode = useCallback(() => {
    toggleDarkMode();
    setTrigger((prev) => prev + 1);
  }, [toggleDarkMode]);

  const { openDrawer, openModal } = useModal();

  return (
    <View>
      <Text>This is a test modal content.</Text>
      <Text>Theme: {theme.dark ? "Dark" : "Light"}</Text>
      <Text>trigger: {trigger}</Text>
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
      <Button onPress={handleToggleDarkMode}>Toggle DarkMode</Button>
      <Button
        onPress={() =>
          openDrawer({
            render: () => {
              return (
                <View style={{ padding: 30 }}>
                  <Text>This is a test drawer content.</Text>
                  <Button
                    onPress={() => {
                      console.log(`open inner modal`);
                      openModal({
                        render: () => {
                          return (
                            <Text>This is a test inner modal content.</Text>
                          );
                        },
                      });
                    }}
                  >
                    Open Inner Modal
                  </Button>
                </View>
              );
            },
          })
        }
      >
        Open Drawer
      </Button>
      <Button onPress={() => resolve({ trigger, theme })}>Confirm</Button>
      <Button onPress={() => reject(new Error("Cancelled"))}>Cancel</Button>
    </View>
  );
};

export default TestModals;
