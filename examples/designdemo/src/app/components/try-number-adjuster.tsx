import { ScreenWrapper, NumberAdjuster } from "@siteed/design-system";
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
  });
};

const TryNumberAdjuster: React.FC = () => {
  const styles = getStyles();
  const [basicValue, setBasicValue] = useState<number>(5);
  const [customValue, setCustomValue] = useState<number>(10);
  const [boundedValue, setBoundedValue] = useState<number>(50);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleLarge">NumberAdjuster Examples</Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text variant="titleMedium">Basic NumberAdjuster</Text>
          <NumberAdjuster
            label="Basic Counter"
            value={basicValue}
            onChange={setBasicValue}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">Custom Step Size</Text>
          <NumberAdjuster
            label="Count by 5"
            value={customValue}
            onChange={setCustomValue}
            step={5}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">Bounded Range</Text>
          <NumberAdjuster
            label="Limited Range (0-100)"
            value={boundedValue}
            onChange={setBoundedValue}
            min={0}
            max={100}
            step={10}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">Custom Styling</Text>
          <NumberAdjuster
            label="Styled Counter"
            value={basicValue}
            onChange={setBasicValue}
            containerStyle={{
              backgroundColor: "#f0f0f0",
              padding: 8,
              borderRadius: 8,
            }}
            buttonStyle={{ minWidth: 48 }}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default TryNumberAdjuster;
