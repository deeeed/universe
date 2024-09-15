import { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button/Button';
import { useModal } from './useModal';

// New component for the modal content
const CounterModal: React.FC<{ resolve: (value: number) => void }> = ({
  resolve,
}) => {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button onPress={() => setCount((prev) => prev + 1)}>Increment</Button>
      <Button onPress={() => resolve(count)}>Close</Button>
    </View>
  );
};

const OpenModalExample: React.FC = () => {
  const { openModal } = useModal();

  const handleSimpleModal = async () => {
    const result = await openModal({
      render: ({ resolve }) => (
        <View>
          <Text>Simple modal content</Text>
          <Button onPress={() => resolve('Simple modal closed')}>Close</Button>
        </View>
      ),
    });
    console.log('Simple modal result:', result);
  };

  const handleModalWithInitialData = async () => {
    const result = await openModal({
      render: ({ resolve }) => <CounterModal resolve={resolve} />,
    });
    console.log('Modal with initial data result:', result);
  };

  const handleNestedModals = async () => {
    await openModal({
      render: ({ resolve }) => (
        <View>
          <Text>This is the first modal</Text>
          <Button
            onPress={() =>
              openModal({
                render: ({ resolve: innerResolve }) => (
                  <View>
                    <Text>This is the second modal</Text>
                    <Button onPress={() => innerResolve('Inner modal closed')}>
                      Close Inner Modal
                    </Button>
                  </View>
                ),
              })
            }
          >
            Open Second Modal
          </Button>
          <Button onPress={() => resolve('Outer modal closed')}>
            Close Outer Modal
          </Button>
        </View>
      ),
    });
  };

  return (
    <View>
      <Button onPress={handleSimpleModal}>Open Simple Modal</Button>
      <Button onPress={handleModalWithInitialData}>
        Open Modal with Initial Data
      </Button>
      <Button onPress={handleNestedModals}>Open Nested Modals</Button>
    </View>
  );
};

const meta: Meta<typeof OpenModalExample> = {
  title: 'Hooks/useModal/openModal',
  component: OpenModalExample,
};

export default meta;

type Story = StoryObj<typeof OpenModalExample>;

export const Default: Story = {};
export const WithInitialData: Story = {};
export const NestedModals: Story = {};
