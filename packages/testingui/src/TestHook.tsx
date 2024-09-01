// packages/testingui/src/index.tsx
import {
  Button,
  CustomBottomSheetModalContext,
  Result,
} from '@siteed/design-system';
import React, { useContext } from 'react';
import { Text, View } from 'react-native';

export const TestHook = () => {
  const { openDrawer } = useContext(CustomBottomSheetModalContext);

  const handleOpen = () => {
    openDrawer({
      render: () => (
        <View>
          <Text>test</Text>
        </View>
      ),
    });
  };
  return (
    <View>
      <Button onPress={handleOpen}>open drawer</Button>
      <Text>index now with update</Text>
      <Result title="test" />
    </View>
  );
};
