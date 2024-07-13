import { RefreshControl } from "@siteed/design-system";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flexGrow: 1,
    },
    content: {
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    list: {
      padding: 20,
    },
    item: {
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
    },
  });
};

export const TryRefreshControl = () => {
  const styles = useMemo(() => getStyles(), []);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000); // simulate a refresh time of 2 seconds
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text>Hello world</Text>
          {/* Add more content to make the ScrollView scrollable */}
          {Array.from({ length: 20 }, (_, index) => (
            <Text key={index} style={{ height: 50 }}>
              Scrollable content {index + 1}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default TryRefreshControl;
