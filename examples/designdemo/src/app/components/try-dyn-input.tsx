import {
  ColorItem,
  DynInput,
  ScreenWrapper,
  SelectOption,
} from "@siteed/design-system";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";

export const randomSelectValues: SelectOption[] = Array.from(
  { length: 20 },
  (_, i) => ({
    label: `label ${i}`, // generating a random string of length 5 for label
    value: `val${i}`, // generating a random string of length 5 for value
  }),
);

export const colors = ["#fbc02d", "#663399", "#ffa000", "#1976d2", "#689f38"];
export const colorOptions: SelectOption[] = colors.map((color) => ({
  label: color,
  value: color,
}));

const TryDynInput = () => {
  return (
    <ScreenWrapper>
      <DynInput data="test" inputType="text" />
      <DynInput
        data={randomSelectValues}
        inputType="select-button"
        multiSelect
        numberOfLines={2}
        max={2}
      />
      <DynInput
        data={colorOptions}
        inputType="custom"
        customRender={(value, _onChange) => {
          const handlePress = (pressed: SelectOption) => {
            console.log("pressed", pressed);
          };

          if (Array.isArray(value)) {
            return (
              <View>
                {value.map((option, index) => (
                  <Pressable
                    key={`${option.label}-${index}`}
                    onPress={() => handlePress(option)}
                  >
                    <ColorItem color={option.value} />
                  </Pressable>
                ))}
              </View>
            );
          }

          return <Text>{JSON.stringify(value)}</Text>;
        }}
      />
    </ScreenWrapper>
  );
};

export default TryDynInput;
