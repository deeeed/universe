import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button/Button';
import { useModal } from '../../hooks/useModal/useModal';
import { AccordionItemProps } from '../../components/Accordion/AccordionItem/AccordionItem';
import { Accordion } from '../../components/Accordion/Accordion';

const getStyles = () => {
  return StyleSheet.create({
    container: {},
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'red',
      minHeight: 200,
    },
  });
};

export interface TestModalsProps {}
export const TestModals = (_: TestModalsProps) => {
  const styles = useMemo(() => getStyles(), []);
  const { openDrawer, editProp, openModal } = useModal();

  const [editableValue, setEditableValue] = useState('Initial Value');
  const [numberValue, setNumberValue] = useState(0);
  const [dateValue, setDateValue] = useState(new Date());

  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const snapPoints = useMemo(() => ['20%', '50%'], []);

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    console.log(`handlePresentModalPress`, bottomSheetModalRef.current);
    bottomSheetModalRef.current?.present();
    bottomSheetModalRef.current?.expand();
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    console.log(`handleOpenDrawer`, openDrawer);
    const result = await openDrawer({
      title: 'This is Title',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => {
        return <Text>Drawer content</Text>;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, []);

  const renderMany = () => {
    const items = [];
    for (let i = 0; i < 100; i++) {
      items.push(<Text key={i}>Item {i}</Text>);
    }
    return items;
  };

  const accordionData: AccordionItemProps[] = [
    {
      title: 'Accordion Item 1',
      children: <Text>Content 1</Text>,
    },
    {
      title: 'Accordion Item 2',
      children: <View>{renderMany()}</View>,
    },
    {
      title: 'Accordion Item 3',
      children: <Text>Content 3</Text>,
    },
  ];

  const handleDynamicDrawer = useCallback(async () => {
    console.log(`handleOpenDrawer`, openDrawer);
    const result = await openDrawer({
      title: 'This is Title',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => {
        return <Accordion data={accordionData} />;
      },
    });
    console.log(`handleOpenDrawer result`, result);
  }, [accordionData, openDrawer]);

  const handleEditProp = useCallback(async () => {
    console.log(`handleEditProp`, editProp);
    const result = await editProp({
      inputType: 'text',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      data: editableValue,
    });
    console.log(`handleEditProp result`, result);
    if (result) {
      setEditableValue(result as string);
    }
  }, [editProp, editableValue]);

  const handleOpenModal = useCallback(async () => {
    const result = await openModal({
      initialData: 'Modal content',
      modalProps: {
        dismissable: true,
      },
      render: ({ resolve, reject }) => (
        <View>
          <Text>This is a modal</Text>
          <Button onPress={() => resolve('Modal closed')}>Close Modal</Button>
          <Button onPress={() => reject(new Error('Modal cancelled'))}>
            Cancel
          </Button>
        </View>
      ),
    });
    console.log('Modal result:', result);
  }, [openModal]);

  const handleEditNumber = useCallback(async () => {
    const result = await editProp({
      inputType: 'number',
      data: numberValue,
      modalType: 'drawer',
      bottomSheetProps: {
        snapPoints: ['25%', '50%'],
      },
    });
    if (result !== undefined) {
      setNumberValue(result as number);
    }
  }, [editProp, numberValue]);

  const handleEditDate = useCallback(async () => {
    const result = await editProp({
      inputType: 'date',
      data: dateValue,
      modalType: 'modal',
      modalProps: {
        dismissable: true,
      },
    });
    if (result !== undefined) {
      setDateValue(result as Date);
    }
  }, [editProp, dateValue]);

  return (
    <View style={styles.container}>
      <View>
        <Text>Modal Examples</Text>
        <Button onPress={handleOpenDrawer}>Open Drawer</Button>
        <Button onPress={handleOpenModal}>Open Modal</Button>
        <Button onPress={handleDynamicDrawer}>
          Open Drawer (with accordion)
        </Button>
      </View>
      <View>
        <Text>Edit Property Examples</Text>
        <Button onPress={handleEditProp}>Edit Text Property</Button>
        <Text>Editable Text Value: {editableValue}</Text>
        <Button onPress={handleEditNumber}>Edit Number Property</Button>
        <Text>Editable Number Value: {numberValue}</Text>
        <Button onPress={handleEditDate}>Edit Date Property</Button>
        <Text>Editable Date Value: {dateValue.toLocaleDateString()}</Text>
      </View>
      <View>
        <Text>Single use</Text>
        <Button onPress={handleOpenDrawer}>open drawer</Button>
        <Button onPress={handleDynamicDrawer}>
          open drawer (with accordion inside)
        </Button>
        <Button onPress={handleEditProp}>Edit Property</Button>
        <Text>Editable Value: {editableValue}</Text>
      </View>
      <View>
        <Text>Within Provider</Text>
        <Button onPress={handlePresentModalPress}>Present Modal</Button>
        <BottomSheetModal
          ref={bottomSheetModalRef}
          enablePanDownToClose
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
        >
          <BottomSheetView style={styles.contentContainer}>
            <Text>Awesome 🎉</Text>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </View>
  );
};
