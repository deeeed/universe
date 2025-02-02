import { Button, ScreenWrapper, useToast } from "@siteed/design-system";
import React from "react";
import { Card, Text } from "react-native-paper";

const TryToasts = () => {
  const { show, hide, loader } = useToast();

  return (
    <ScreenWrapper>
      <Card>
        <Card.Content>
          <Text variant="titleLarge">Toast Examples</Text>

          {/* Basic Toasts Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Basic Toasts
          </Text>
          <Button
            onPress={() => {
              show({
                message: "Information message",
                subMessage: "More details about the info",
                type: "info",
              });
            }}
          >
            Info Toast
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Success message",
                type: "success",
                iconVisible: true,
              });
            }}
          >
            Success Toast
          </Button>

          {/* Interactive Toasts Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Interactive Toasts
          </Text>
          <Button
            onPress={() => {
              show({
                message: "👈 Swipe left to dismiss",
                type: "info",
                swipeConfig: { isEnabled: true, direction: "right-to-left" },
              });
            }}
          >
            Left Swipe Toast
          </Button>

          <Button
            onPress={() => {
              show({
                message: "👉 Swipe right to dismiss",
                type: "warning",
                swipeConfig: { isEnabled: true, direction: "left-to-right" },
              });
            }}
          >
            Right Swipe Toast
          </Button>

          <Button
            onPress={() => {
              show({
                message: "👈👉 Swipe either direction",
                type: "success",
                swipeConfig: { isEnabled: true, direction: "both" },
              });
            }}
          >
            Bi-directional Swipe Toast
          </Button>

          {/* Close Icon Toasts Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Close Icon Toasts
          </Text>
          <Button
            onPress={() => {
              show({
                message: "Click the X to close",
                type: "info",
                showCloseIcon: true,
              });
            }}
          >
            Toast with Close Icon
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Swipe or click X to close",
                type: "success",
                showCloseIcon: true,
                swipeConfig: { isEnabled: true, direction: "both" },
              });
            }}
          >
            Interactive Toast with Close
          </Button>

          {/* Utility Toasts Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Utility Toasts
          </Text>
          <Button onPress={() => loader("Loading...", { position: "middle" })}>
            Loading Toast
          </Button>

          <Button
            onPress={() => {
              hide();
            }}
          >
            Hide All Toasts
          </Button>

          {/* Stacking Behavior Section */}
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>
            Stacking Behavior
          </Text>
          <Button
            onPress={() => {
              show({
                message: "Stacked Toast 1",
                type: "info",
                stackBehavior: {
                  isStackable: true,
                  stackSpacing: 0, // Directly on top
                },
              });
              show({
                message: "Stacked Toast 2",
                type: "success",
                stackBehavior: {
                  isStackable: true,
                  stackSpacing: 0,
                },
              });
            }}
          >
            Stack Toasts (No Spacing)
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Spaced Toast 1",
                type: "info",
                stackBehavior: {
                  isStackable: true,
                  stackSpacing: 60, // Add space between toasts
                },
              });
              show({
                message: "Spaced Toast 2",
                type: "success",
                stackBehavior: {
                  isStackable: true,
                  stackSpacing: 60,
                },
              });
            }}
          >
            Stack Toasts (With Spacing)
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Replace All Toasts",
                type: "warning",
                stackBehavior: {
                  replaceAll: true,
                },
              });
            }}
          >
            Replace All Toasts
          </Button>
        </Card.Content>
      </Card>
    </ScreenWrapper>
  );
};

export default TryToasts;
