// packages/design-system/src/components/refresh-control/refresh-control.stories.tsx
import type { Meta } from '@storybook/react';
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { RefreshControl } from './refresh-control';

const RefreshControlWebMeta: Meta = {
  component: RefreshControl,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
};

export default RefreshControlWebMeta;

export const WithScrollView = (args) => {
  const [refreshing, setRefreshing] = useState(args.refreshing);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000); // simulate a refresh time of 2 seconds
  };

  return (
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
  );
};

export const WithFlatList = (args) => {
  const [refreshing, setRefreshing] = useState(args.refreshing);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000); // simulate a refresh time of 2 seconds
  };

  const data = Array.from({ length: 20 }, (_, index) => ({
    key: `${index}`,
    text: `Scrollable content ${index + 1}`,
  }));

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>{item.text}</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  list: {
    padding: 20,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
