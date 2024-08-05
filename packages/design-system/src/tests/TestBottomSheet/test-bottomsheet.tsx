import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button/Button';
import { useBottomModal } from '../../hooks/useBottomModal';
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

export interface TestBottomSheetProps {}
export const TestBottomSheet = (_: TestBottomSheetProps) => {
  const styles = useMemo(() => getStyles(), []);
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const snapPoints = useMemo(() => ['20%', '50%'], []);

  const { openDrawer } = useBottomModal();

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

  return (
    <View style={styles.container}>
      <View>
        <Text>Single use</Text>
        <Button onPress={handleOpenDrawer}>open drawer</Button>
        <Button onPress={handleDynamicDrawer}>
          open drawer (with according inside)
        </Button>
      </View>
      <View>
        <Text>Within Provider</Text>
        <Button onPress={handlePresentModalPress}>Present Modal</Button>
        <BottomSheetModal
          // enableDynamicSizing
          ref={bottomSheetModalRef}
          enablePanDownToClose
          index={0}
          snapPoints={snapPoints}
          // containerStyle={{ backgroundColor: 'transparent' }}
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
