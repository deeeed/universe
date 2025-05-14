import {
  Accordion,
  AccordionItemProps,
  LabelSwitch,
  LockInput,
  ScreenWrapper,
  TextInput,
  useThemePreferences,
} from "@siteed/design-system";
import { View } from "react-native";
import { Text } from "react-native-paper";

const RandomPage = () => {
  const { darkMode, toggleDarkMode } = useThemePreferences();

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
  return (
    <ScreenWrapper>
      <LabelSwitch
        label="Dark Mode"
        onValueChange={toggleDarkMode}
        value={darkMode}
      />
      <LockInput text="This is a locked input" locked />
      <TextInput placeholder="sdfafd">sfaf</TextInput>
      <Accordion data={accordionData} />
    </ScreenWrapper>
  );
};

export default RandomPage;
