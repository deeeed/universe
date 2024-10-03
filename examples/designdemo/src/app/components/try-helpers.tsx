import {
  ScreenWrapper,
  HelperText,
  HelperWrapper,
  NumberAdjuster,
  Button,
} from "@siteed/design-system";
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text, TextInput } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    input: {
      marginBottom: 8,
    },
  });
};

const TryHelpers: React.FC = () => {
  const styles = getStyles();
  const [username, setUsername] = useState<string>("");
  const [speakerCount, setSpeakerCount] = useState<number>(2);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleLarge">Helper Components Examples</Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text variant="titleMedium">HelperText Component</Text>
          <HelperText
            text="This is a simple HelperText component. It can display information with an icon."
            iconSize={20}
            iconColor="#4A90E2"
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">HelperText with Long Text</Text>
          <HelperText
            text="This is a longer HelperText component that demonstrates the maxLines property. It will truncate after one line and show an ellipsis. You can tap to expand and see the full text."
            maxLines={1}
            iconSize={20}
            iconColor="#4A90E2"
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">HelperWrapper with TextInput</Text>
          <HelperWrapper
            helperText="Enter a unique username for your account."
            iconPosition="right"
          >
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />
          </HelperWrapper>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">HelperWrapper with NumberAdjuster</Text>
          <HelperWrapper
            helperText="Adjust the number of speakers for your event."
            iconPosition="left"
          >
            <NumberAdjuster
              label="Number of Speakers"
              value={speakerCount}
              onChange={setSpeakerCount}
            />
          </HelperWrapper>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">HelperWrapper with Button</Text>
          <HelperWrapper
            helperText="Click this button to submit your form."
            iconPosition="right"
          >
            <Button
              mode="contained"
              onPress={() => console.log("Button pressed")}
            >
              Submit
            </Button>
          </HelperWrapper>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default TryHelpers;
