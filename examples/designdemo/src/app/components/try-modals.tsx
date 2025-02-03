import { Button, ScreenWrapper, useModal } from "@siteed/design-system";
import React, { useCallback } from "react";
import { View } from "react-native";
import { Text, Card } from "react-native-paper";

const TryModals = () => {
  const { openModal, openDrawer } = useModal();

  const handleBasicModal = useCallback(async () => {
    try {
      const result = await openModal({
        render: ({ resolve, reject }) => (
          <View style={{ padding: 20 }}>
            <Text>Basic Modal Content</Text>
            <Button onPress={() => resolve("confirmed")}>Confirm</Button>
            <Button onPress={() => reject(new Error("cancelled"))}>
              Cancel
            </Button>
          </View>
        ),
      });
      console.log("Modal result:", result);
    } catch (error) {
      console.log("Modal cancelled:", error);
    }
  }, [openModal]);

  const handleModalWithCloseButton = useCallback(async () => {
    try {
      const result = await openModal({
        modalProps: {
          showCloseButton: true,
          closeButtonPosition: "top-right",
          styles: {
            closeButton: {
              backgroundColor: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
        render: ({ resolve }) => (
          <View style={{ padding: 20 }}>
            <Text>Modal with Close Button</Text>
            <Text>Try clicking the close button in the top-right corner</Text>
            <Button onPress={() => resolve("done")}>Done</Button>
          </View>
        ),
      });
      console.log("Modal result:", result);
    } catch (error) {
      console.log("Modal cancelled:", error);
    }
  }, [openModal]);

  const handleDrawerExample = useCallback(async () => {
    try {
      const result = await openDrawer({
        render: ({ resolve }) => (
          <View style={{ padding: 20 }}>
            <Text>Basic Drawer Content</Text>
            <Button onPress={() => resolve("drawer closed")}>
              Close Drawer
            </Button>
          </View>
        ),
      });
      console.log("Drawer result:", result);
    } catch (error) {
      console.log("Drawer cancelled:", error);
    }
  }, [openDrawer]);

  const handleNestedModals = useCallback(async () => {
    try {
      await openModal({
        modalProps: {
          showCloseButton: true,
        },
        render: ({ resolve }) => (
          <View style={{ padding: 20 }}>
            <Text>Parent Modal</Text>
            <Button
              onPress={async () => {
                try {
                  const innerResult = await openDrawer({
                    render: ({ resolve: innerResolve }) => (
                      <View style={{ padding: 20 }}>
                        <Text>Nested Drawer</Text>
                        <Button onPress={() => innerResolve("inner done")}>
                          Close Inner Drawer
                        </Button>
                      </View>
                    ),
                  });
                  console.log("Inner drawer result:", innerResult);
                } catch (error) {
                  console.log("Inner drawer cancelled:", error);
                }
              }}
            >
              Open Nested Drawer
            </Button>
            <Button onPress={() => resolve("parent done")}>
              Close Parent Modal
            </Button>
          </View>
        ),
      });
    } catch (error) {
      console.log("Nested modal cancelled:", error);
    }
  }, [openModal, openDrawer]);

  return (
    <ScreenWrapper>
      <Card>
        <Card.Content>
          <Text variant="titleLarge">Modal Examples</Text>

          {/* Basic Modals Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Basic Modals
          </Text>
          <Button onPress={handleBasicModal}>Basic Modal</Button>
          <Button onPress={handleModalWithCloseButton}>
            Modal with Close Button
          </Button>

          {/* Drawer Examples */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Drawer Examples
          </Text>
          <Button onPress={handleDrawerExample}>Basic Drawer</Button>

          {/* Advanced Examples */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Advanced Examples
          </Text>
          <Button onPress={handleNestedModals}>Nested Modals</Button>

          {/* Custom Styling Example */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Custom Styling
          </Text>
          <Button
            onPress={() =>
              openModal({
                modalProps: {
                  showCloseButton: true,
                  styles: {
                    modalContent: {
                      backgroundColor: "#f0f0f0",
                      borderRadius: 20,
                      padding: 20,
                    },
                    backdrop: {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                    },
                    closeButton: {
                      backgroundColor: "#e0e0e0",
                    },
                  },
                },
                render: ({ resolve }) => (
                  <View>
                    <Text>Custom Styled Modal</Text>
                    <Button onPress={() => resolve("styled done")}>Done</Button>
                  </View>
                ),
              })
            }
          >
            Custom Styled Modal
          </Button>
        </Card.Content>
      </Card>
    </ScreenWrapper>
  );
};

export default TryModals;
