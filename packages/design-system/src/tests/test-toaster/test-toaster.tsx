import React from 'react';
import { Button } from 'react-native-paper';
import { ScreenWrapper } from '../../components/screen-wrapper/screen-wrapper';
import { useToast } from '../../hooks/useToast';

export interface TestToastersProps {}
export const TestToasters = (_: TestToastersProps) => {
  const { show, hide, loader } = useToast();
  return (
    <ScreenWrapper contentContainerStyle={{ gap: 15 }}>
      <Button
        onPress={() => {
          show({
            message: 'You have succeeded!',
            iconVisible: true,
            type: 'success',
          });
        }}
      >
        Success Toaster
      </Button>

      <Button
        onPress={() => {
          show({
            message: 'You have a warning!',
            type: 'warning',
            duration: Infinity,
          });
        }}
      >
        Infinite Warning
      </Button>

      <Button onPress={() => loader('Loading...')}>Loading Toaster</Button>

      <Button
        onPress={() => {
          show({
            subMessage: 'You have failed!',
            message: 'Error!',
            type: 'error',
          });
        }}
      >
        Error Toaster
      </Button>

      <Button
        onPress={() => {
          hide();
        }}
      >
        Hide All
      </Button>
    </ScreenWrapper>
  );
};
