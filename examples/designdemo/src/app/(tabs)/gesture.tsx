import {
  Result,
  ScreenWrapper,
  Skeleton,
  useToast,
} from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      gap: 5,
    },
    speakersContainer: {
      marginTop: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingBottom: 50,
    },
    speakerItemContainer: {
      flexDirection: "column",
      justifyContent: "space-between",
      borderWidth: 1,
      padding: 10,
      maxWidth: 300,
    },
  });
};

export default function () {
  const { logger } = useLogger("RecordingsScreen");
  const styles = useMemo(() => getStyles(), []);

  const renderLeftActions = (progress: any, dragX: any) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100, 101],
      outputRange: [-20, 0, 0, 1],
    });
    return (
      <RectButton
        onPress={() => {
          console.log(`TODO`);
        }}
      >
        <Animated.Text
          style={[
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          Archive
        </Animated.Text>
      </RectButton>
    );
  };

  return (
    <ScreenWrapper withScrollView={false} useInsets={false}>
      <Swipeable renderLeftActions={renderLeftActions}>
        <View style={{ height: 50, padding: 10, backgroundColor: "red" }}>
          <Text>ok</Text>
        </View>
      </Swipeable>
    </ScreenWrapper>
  );
}
