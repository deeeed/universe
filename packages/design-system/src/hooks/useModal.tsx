import { BottomSheetModalProps } from '@gorhom/bottom-sheet';
import React, { useCallback, useContext } from 'react';
import { Platform } from 'react-native';
import { ModalProps } from 'react-native-paper';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/DynInput/DynInput';
import { BottomSheetContext } from '../providers/BottomSheetProvider';
import { ModalContext } from '../providers/ModalProvider';
import { baseLogger } from '../utils/logger';

export interface EditPropProps extends DynInputProps {
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  modalProps?: Partial<ModalProps>;
  modalType?: 'drawer' | 'modal';
}

const logger = baseLogger.extend('useModal');

export const useModal = () => {
  const bottomSheetContext = useContext(BottomSheetContext);
  const modalContext = useContext(ModalContext);

  if (!bottomSheetContext || !modalContext) {
    throw new Error(
      'useModal must be used within both BottomSheetProvider and ModalProvider'
    );
  }

  const { openDrawer } = bottomSheetContext;
  const { openModal } = modalContext;

  const editProp = useCallback(
    async (props: EditPropProps): Promise<DynamicType | undefined> => {
      logger.debug('editProp', props);
      const { bottomSheetProps, modalProps, modalType, data, ...restProps } =
        props;

      const actualModalType =
        modalType ?? (Platform.OS === 'web' ? 'modal' : 'drawer');

      if (actualModalType === 'modal') {
        return openModal({
          initialData: data,
          modalProps: modalProps,
          render: ({ resolve }) => (
            <DynInput
              {...restProps}
              data={data}
              useFlatList={false}
              autoFocus={true}
              finishOnEnter={true}
              selectTextOnFocus={true}
              withinBottomSheet={false}
              onCancel={() => {
                resolve(data);
              }}
              onFinish={(values: DynamicType) => {
                resolve(values);
              }}
            />
          ),
        });
      }

      // Drawer logic
      return openDrawer({
        bottomSheetProps: {
          ...bottomSheetProps,
          enableDynamicSizing: bottomSheetProps?.enableDynamicSizing,
          snapPoints: bottomSheetProps?.snapPoints,
          index: bottomSheetProps?.index,
        },
        initialData: data,
        render: ({ resolve }) => (
          <DynInput
            {...restProps}
            data={data}
            useFlatList={false}
            autoFocus={true}
            withinBottomSheet={true}
            selectTextOnFocus={true}
            finishOnEnter={true}
            onCancel={() => {
              resolve?.(data);
            }}
            onFinish={(values: DynamicType) => {
              resolve?.(values);
            }}
          />
        ),
      });
    },
    [openModal, openDrawer]
  );

  return {
    ...bottomSheetContext,
    ...modalContext,
    editProp,
  };
};
