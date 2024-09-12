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

          <Button
            onPress={() => {
              show({
                message: "Success with action",
                type: "success",
                action: () => console.log("Action clicked"),
              });
            }}
          >
            Success Toast with Action
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Warning message",
                type: "warning",
              });
            }}
          >
            Warning Toast
          </Button>

          <Button
            onPress={() => {
              show({
                message: "Error message",
                type: "error",
              });
            }}
          >
            Error Toast
          </Button>

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
        </Card.Content>
      </Card>
    </ScreenWrapper>
  );
};

export default TryToasts;
