import {
  Picker,
  ScreenWrapper,
  SelectOption,
  useTheme,
  useToast,
} from "@siteed/design-system";
import React, { useState } from "react";
import { Card, Text } from "react-native-paper";

const initialOptions: SelectOption[] = [
  { label: "Daily Sentences", value: "1", selected: true },
  { label: "Custom Cards", value: "2" },
  { label: "Greetings", value: "3" },
  { label: "Dinings & Food", value: "4" },
  { label: "Shopping", value: "5", selected: true },
  { label: "Direction & Transportation", value: "6" },
  { label: "Accommodation", value: "7" },
];

const colorOptions = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
  { label: "Yellow", value: "yellow" },
  { label: "Purple", value: "purple" },
];

const TryPickers = () => {
  const theme = useTheme();
  const { show: showToast } = useToast();
  const [options, setOptions] = useState(initialOptions);
  const [colorOptionsWithSelection, setColorOptionsWithSelection] = useState(
    colorOptions.map((opt, index) => ({
      ...opt,
      selected: index < 2,
      color: opt.value,
    })),
  );

  const handleFinish = (selected: SelectOption[]) => {
    setOptions(selected);
    showToast({ message: `Selected ${selected.length} options` });
  };

  const handleColorFinish = (selected: SelectOption[]) => {
    setColorOptionsWithSelection(
      selected.map((item) => ({
        ...item,
        selected: true,
        color: item.value,
      })),
    );
    showToast({ message: `Selected ${selected.length} colors` });
  };

  const handleCustomPress = (item: SelectOption) => {
    showToast({ message: `CUSTOM ACTION: ${item.label} pressed` });
  };

  return (
    <ScreenWrapper>
      <Card
        contentStyle={{ gap: theme.spacing.gap, padding: theme.spacing.gap }}
      >
        <Text variant="titleLarge">Picker Examples</Text>

        <Picker
          label="Standard Multi-Select"
          options={options}
          multi
          onFinish={handleFinish}
        />

        <Picker
          label="With Search"
          options={options}
          multi
          showSearch
          onFinish={handleFinish}
        />

        <Picker
          label="Wrapped Options"
          options={options}
          multi
          fullWidthOptions={false}
          onFinish={handleFinish}
        />

        <Picker
          label="Empty State"
          options={[]}
          multi
          emptyLabel="No options available"
        />

        <Picker
          label="Colored Options"
          options={colorOptionsWithSelection}
          multi
          onFinish={handleColorFinish}
        />

        <Picker
          label="Custom Press Behavior"
          options={options}
          multi
          onItemPress={handleCustomPress}
        />
      </Card>
    </ScreenWrapper>
  );
};

export default TryPickers;
