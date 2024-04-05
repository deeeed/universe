import {
  Accordion,
  AccordionItemProps,
  ScreenWrapper,
} from "@siteed/design-system";
import { View } from "react-native";
import { Text } from "react-native-paper";

const SecondPage = () => {
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
      <Accordion data={accordionData} />
    </ScreenWrapper>
  );
};

export default SecondPage;
