import { ListItem } from "@siteed/design-system";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, StyleSheet } from "react-native";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

const links = [
  {
    label: "Accordion",
    subLabel: "Explore Accordion Component",
    path: "/components/try-accordion",
  },
  {
    label: "RefreshControl",
    subLabel: "Explore RefreshControl Components",
    path: "/components/try-refresh-control",
  },
  {
    label: "Toasts",
    subLabel: "Explore Toast Components",
    path: "/components/try-toasts",
  },
];

export const TryItComponents = () => {
  const styles = useMemo(() => getStyles(), []);
  const router = useRouter();
  return (
    <FlatList
      data={links}
      renderItem={({ item }) => (
        <ListItem
          label={item.label}
          subLabel={item.subLabel}
          labelStyle={{}}
          onPress={() => {
            router.navigate(`${item.path}`);
          }}
        />
      )}
    />
  );
};

export default TryItComponents;
