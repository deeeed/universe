// examples/designdemo/src/app/(tabs)/bottom.tsx
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
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
    contentContainer: {
      flex: 1,
      width: "100%",
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
  const { toggleDarkMode } = useThemePreferences();
  const theme = useTheme();

  // variables
  const _snapPoints = useMemo(() => ["20%", "50%"], []);

  const { openDrawer, editProp, openModal } = useModal();

  const [test, setTest] = useState<Test>({ name: "test" });

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
            closeOnOutsideTouch: false,
            showBackdrop: false,
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
