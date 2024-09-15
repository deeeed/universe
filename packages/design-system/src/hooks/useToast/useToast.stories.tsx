import type { Meta } from '@storybook/react';
import React from 'react';
import { Button } from 'react-native-paper';
import { ScreenWrapper } from '../../components/ScreenWrapper/ScreenWrapper';
import { useToast } from './useToast';

const UseToastMeta: Meta = {
  title: 'Hooks/useToast',
  parameters: {
    docs: {
      description: {
        component: 'A hook for displaying toast notifications.',
      },
    },
  },
};

export default UseToastMeta;

const UseToastDemo: React.FC = () => {
  const { show, hide, loader } = useToast();

  return (
    <ScreenWrapper contentContainerStyle={{ gap: 15 }}>
      <Button
        onPress={() => {
          show({
            message: 'Success message',
            iconVisible: true,
            type: 'success',
          });
        }}
      >
        Show Success Toast
      </Button>

      <Button
        onPress={() => {
          show({
            message: 'Warning message',
            type: 'warning',
            duration: 5000,
          });
        }}
      >
        Show Warning Toast
      </Button>

      <Button
        onPress={() => {
          show({
            message: 'Error message',
            subMessage: 'Additional error details',
            type: 'error',
          });
        }}
      >
        Show Error Toast
      </Button>

      <Button onPress={() => loader('Loading...')}>Show Loading Toast</Button>

      <Button onPress={hide}>Hide All Toasts</Button>
    </ScreenWrapper>
  );
};

export const Default = () => <UseToastDemo />;
