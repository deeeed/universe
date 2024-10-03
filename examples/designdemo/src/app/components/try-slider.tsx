import { ScreenWrapper, Slider } from "@siteed/design-system";
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      padding: 16,
    },
    sliderContainer: {
      marginBottom: 24,
    },
    cardContent: {
      marginBottom: 16,
    },
  });
};

const TrySlider: React.FC = () => {
  const styles = getStyles();
  const [basicValue, setBasicValue] = useState<number>(50);
  const [steppedValue, setSteppedValue] = useState<number>(0);
  const [formattedValue, setFormattedValue] = useState<number>(0);
  const [disabledValue] = useState<number>(30);

  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Card style={styles.cardContent}>
          <Card.Content>
            <Text variant="titleLarge">Slider Examples</Text>
          </Card.Content>
        </Card>

        <View style={styles.sliderContainer}>
          <Slider
            label="Basic Slider"
            value={basicValue}
            minimumValue={0}
            maximumValue={100}
            onValueChange={setBasicValue}
            showValue
          />
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            label="Stepped Slider (Step: 10)"
            value={steppedValue}
            minimumValue={0}
            maximumValue={100}
            step={10}
            onValueChange={setSteppedValue}
            showValue
          />
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            label="Formatted Value Slider"
            value={formattedValue}
            minimumValue={0}
            maximumValue={1000}
            onValueChange={setFormattedValue}
            showValue
            valueFormatter={formatCurrency}
          />
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            label="Disabled Slider"
            value={disabledValue}
            minimumValue={0}
            maximumValue={100}
            onValueChange={() => {}}
            disabled
            showValue
          />
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default TrySlider;
