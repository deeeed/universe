import { RefreshControl } from "@siteed/design-system";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  item: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    height: 150,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
  selectedButton: { backgroundColor: "#6200ee" },
  selectedButtonLabel: { color: "white" },
});

type ListItem = { id: string; text: string };
type ListType = "flatlist" | "scrollview";

const LIST_TYPES: ListType[] = ["flatlist", "scrollview"];

export const TryRefreshControl: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [listType, setListType] = useState<ListType>("flatlist");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const data: ListItem[] = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: `${listType}-${index}`,
        text: `Scrollable content ${index + 1}`,
      })),
    [listType],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <View style={styles.item}>
        <Text>{item.text}</Text>
      </View>
    ),
    [],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
    [refreshing, onRefresh],
  );

  const renderContent = useCallback(() => {
    const commonProps = {
      contentContainerStyle: styles.content,
      refreshControl,
    };

    return listType === "flatlist" ? (
      <FlatList
        {...commonProps}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    ) : (
      <ScrollView {...commonProps}>
        {data.map((item) => (
          <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>
        ))}
      </ScrollView>
    );
  }, [data, listType, refreshControl, renderItem]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {LIST_TYPES.map((type) => (
          <Button
            key={type}
            mode={listType === type ? "contained" : "outlined"}
            onPress={() => setListType(type)}
            style={listType === type ? styles.selectedButton : undefined}
            labelStyle={
              listType === type ? styles.selectedButtonLabel : undefined
            }
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </View>
      {renderContent()}
    </View>
  );
};

export default TryRefreshControl;
