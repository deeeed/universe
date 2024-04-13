import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/button/Button';

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

export interface TestBottomSheetProps {
  label: string;
}
export const TestBottomSheet = ({ label }: TestBottomSheetProps) => {
  const styles = useMemo(() => getStyles(), []);
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

  return (
    <View style={styles.container}>
      <Text>{label}</Text>
      <View style={styles.container}>
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
