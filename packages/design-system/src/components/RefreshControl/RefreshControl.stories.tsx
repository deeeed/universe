// packages/design-system/src/components/refresh-control/refresh-control.stories.tsx
import type { Meta } from '@storybook/react';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { RefreshControl, RefreshControlProps } from './RefreshControl';

const RefreshControlWebMeta: Meta = {
  component: RefreshControl,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
};

export default RefreshControlWebMeta;

export const WithScrollView = (args: RefreshControlProps) => {
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

export const WithFlatList = (args: RefreshControlProps) => {
  const [refreshing, setRefreshing] = useState(args.refreshing);
  const [isPulling, setIsPulling] = useState(false);

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

  const handlePullStateChange = useCallback((pulling: boolean) => {
    setIsPulling(pulling);
  }, []);

  const renderItem = ({ item }: { item: { key: string; text: string } }) => (
    <Pressable
      style={styles.item}
      onPress={() => {
        if (!isPulling) {
          console.log('Item pressed:', item.text);
        } else {
          console.log('Press prevented due to pull gesture');
        }
      }}
    >
      <Text>{item.text}</Text>
    </Pressable>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          onPullStateChange={handlePullStateChange}
        />
      }
    />
  );
};

export const WithEmptyState = (args: RefreshControlProps) => {
  const [refreshing, setRefreshing] = useState(args.refreshing);
  const [hasData, setHasData] = useState(false);

  const onRefresh = () => {
    console.log('onRefresh');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setHasData(true);
    }, 2000); // simulate a refresh time of 2 seconds
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollView, styles.emptyStateContainer]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {hasData ? (
        <Text>Data loaded after refresh</Text>
      ) : (
        <Text>Pull down to refresh and load data</Text>
      )}
    </ScrollView>
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
