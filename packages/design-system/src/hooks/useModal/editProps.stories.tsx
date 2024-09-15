import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { StoryFn, Meta } from '@storybook/react';
import { useModal } from './useModal';

export default {
  title: 'Hooks/useModal/editProp',
} as Meta;

const Template: StoryFn = () => {
  const { editProp } = useModal();

  const handleEditText = async () => {
    const result = await editProp({
      data: 'Initial text',
      inputType: 'text',
      label: 'Edit Text',
    });
    console.log('Edited text:', result);
  };

  const handleEditNumber = async () => {
    const result = await editProp({
      data: 42,
      inputType: 'number',
      label: 'Edit Number',
    });
    console.log('Edited number:', result);
  };

  const handleEditDate = async () => {
    const result = await editProp({
      data: new Date(),
      inputType: 'date',
      label: 'Edit Date',
    });
    console.log('Edited date:', result);
  };

  const handleEditSelect = async () => {
    const options = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
      { label: 'Option 3', value: '3' },
    ];
    const result = await editProp({
      data: options,
      inputType: 'select-button',
      label: 'Select Option',
      multiSelect: false,
    });
    console.log('Selected option:', result);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button onPress={handleEditText} style={{ marginBottom: 10 }}>
        Edit Text
      </Button>
      <Button onPress={handleEditNumber} style={{ marginBottom: 10 }}>
        Edit Number
      </Button>
      <Button onPress={handleEditDate} style={{ marginBottom: 10 }}>
        Edit Date
      </Button>
      <Button onPress={handleEditSelect} style={{ marginBottom: 10 }}>
        Edit Select
      </Button>
    </View>
  );
};

export const Default = Template.bind({});

export const ModalTypeStory: StoryFn = () => {
  const { editProp } = useModal();

  const handleEditWithModal = async () => {
    const result = await editProp({
      data: 'Modal text',
      inputType: 'text',
      label: 'Edit in Modal',
      modalType: 'modal',
    });
    console.log('Edited text in modal:', result);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button onPress={handleEditWithModal}>Edit in Modal</Button>
    </View>
  );
};

export const DrawerTypeStory: StoryFn = () => {
  const { editProp } = useModal();

  const handleEditWithDrawer = async () => {
    const result = await editProp({
      data: 'Drawer text',
      inputType: 'text',
      label: 'Edit in Drawer',
      modalType: 'drawer',
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
      },
    });
    console.log('Edited text in drawer:', result);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button onPress={handleEditWithDrawer}>Edit in Drawer</Button>
    </View>
  );
};
