import { BottomSheetModalProps } from '@gorhom/bottom-sheet';
import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../../components/DynInput/DynInput';
import { useModalController } from '../../providers/ModalControllerProvider';
import { OpenModalProps } from '../../providers/ModalProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { baseLogger } from '../../utils/logger';

const logger = baseLogger.extend('useModal');

export interface EditPropProps extends DynInputProps {
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  headerComponent?: React.ReactNode;
  modalProps?: Partial<OpenModalProps['modalProps']>;
  modalType?: 'drawer' | 'modal';
}

export const useModal = () => {
  const modalControllerContext = useModalController();
  const { colors } = useTheme();

  if (!modalControllerContext) {
    throw new Error(
      'useModal must be used within both BottomSheetProvider and ModalProvider'
    );
  }

  const { openDrawer, openModal, dismiss, dismissAll, modalStack } =
    modalControllerContext;

  const editProp = useCallback(
    async ({
      bottomSheetProps,
      modalProps,
      modalType,
      data,
      headerComponent,
      inputType,
      ...restProps
    }: EditPropProps): Promise<DynamicType | undefined> => {
      logger.debug('editProp', {
        bottomSheetProps,
        modalProps,
        modalType,
        data,
        inputType,
        ...restProps,
      });

      const isDateTimeType = ['date', 'time', 'datetime'].includes(inputType);
      const actualModalType =
        modalType ??
        (isDateTimeType || Platform.OS === 'web' ? 'modal' : 'drawer');

      const commonProps = {
        initialData: data,
        modalProps: {
          closeOnOutsideTouch: modalProps?.closeOnOutsideTouch ?? false,
          ...modalProps,
        },
        render: ({
          resolve,
          onChange,
        }: {
          resolve?: (value: DynamicType | undefined) => void;
          onChange?: (value: DynamicType) => void;
          reject?: (error: Error) => void;
        }) => {
          return (
            <>
              {headerComponent && headerComponent}
              <DynInput
                {...restProps}
                data={data}
                useFlatList={false}
                inputType={inputType}
                finishOnEnter={true}
                selectTextOnFocus={true}
                onCancel={() => {
                  logger.debug('DynInput onCancel');
                  resolve?.(data);
                }}
                onFinish={(values: DynamicType) => {
                  logger.debug('DynInput onFinish', values);
                  resolve?.(values);
                }}
                onChange={(value: DynamicType) => {
                  logger.debug('DynInput onChange', value);
                  onChange?.(value);
                }}
                showFooter={true} // Force showing footer
                initiallyOpen={true} // Ensure the input is initially open
              />
            </>
          );
        },
      };

      if (actualModalType === 'modal') {
        const isDateTimeType = ['date', 'time', 'datetime'].includes(inputType);
        return openModal({
          ...commonProps,
          modalProps: {
            ...modalProps,
            styles: {
              modalContent: {
                backgroundColor: isDateTimeType
                  ? 'transparent'
                  : colors.surface,
              },
              backdrop: modalProps?.styles?.backdrop,
            },
          },
        });
      }

      return openDrawer({
        ...commonProps,
        bottomSheetProps: {
          ...bottomSheetProps,
          enableDynamicSizing: bottomSheetProps?.enableDynamicSizing ?? true,
          snapPoints: bottomSheetProps?.snapPoints,
          index: bottomSheetProps?.index,
        },
      });
    },
    [openModal, openDrawer]
  );

  return {
    editProp,
    dismiss,
    dismissAll,
    openDrawer,
    openModal,
    modalStack,
  };
};
