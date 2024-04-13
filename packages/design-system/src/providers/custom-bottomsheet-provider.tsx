import {
  BottomSheetFooterProps,
  BottomSheetHandle,
  BottomSheetHandleProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useLoggerActions } from '@siteed/react-native-logger';
import React, {
  FunctionComponent,
  ReactNode,
  createContext,
  useCallback,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import {
  CustomBackdrop,
  CustomBackdropProps,
} from '../components/bottom-modal/backdrop/custom-backdrop';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/confirm-cancel-footer';
import { LabelHandler } from '../components/bottom-modal/handlers/label-handler';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/dyn-input/dyn-input';
import { SelectItemOption } from '../components/select-items/select-items';

export interface CustomBottomSheetModalProviderProps {
  dismiss: (key?: string) => boolean;
  editProp: (props: DynInputProps) => Promise<DynInputProps['data']>;
  openDrawer: ({
    render,
  }: {
    snapPoints?: string[];
    title?: string;
    footerType?: 'confirm_cancel';
    initialData?: unknown;
    render: (props: {
      resolve?: (value: unknown) => void;
      onChange?: (value: unknown) => void;
      reject?: (error: unknown) => void;
    }) => ReactNode;
  }) => Promise<unknown>;
  dismissAll: () => void;
}

export const CustomBottomSheetModalContext = createContext<
  CustomBottomSheetModalProviderProps | undefined
>(undefined);

interface CustomBottomSheetModalProps {
  children: ReactNode;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    paddingBottom: 40,
  },
});

const defaultSnapPoints = ['40%', '80%'];

const WithProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const { dismiss, dismissAll } = useBottomSheetModal();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [_snapPoints, setSnapPoints] = useState(defaultSnapPoints);
  const { logger } = useLoggerActions('CustomBottomSheetModalProvider');
  const onFinishResolveRef = useRef<(values: DynInputProps['data']) => void>();
  const onCustomDrawerResolveRef = useRef<(values: unknown) => void>();
  const onCustomDrawerRejectRef = useRef<(error: unknown) => void>();
  const [drawerContent, setDrawerContent] = useState<ReactNode>();
  const [footerType, setFooterType] = useState<'confirm_cancel'>();
  const [title, setTitle] = useState<string>();

  const initialInputParamsRef = useRef<string>();
  const latestInputParamsRef = useRef<unknown>();
  // const { t } = useTranslation('bottom_modal');

  const editProp = useCallback(
    async (
      props: Omit<DynInputProps, 'onFinish'>
    ): Promise<DynInputProps['data']> => {
      const newInputParams = {
        ...props,
        onCancel: () => {
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.dismiss();
          }
        },
        onFinish: (values: DynamicType) => {
          if (onFinishResolveRef.current) {
            onFinishResolveRef.current(values);
            onFinishResolveRef.current = undefined;
          }
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.dismiss();
          }
        },
      };

      logger.debug('editProp', props, newInputParams);
      setDrawerContent(<DynInput {...newInputParams} />);

      if (bottomSheetModalRef.current) {
        bottomSheetModalRef.current.snapToIndex(0);
        bottomSheetModalRef.current.present();
      }

      return new Promise((resolve) => {
        onFinishResolveRef.current = resolve;
      });
    },
    []
  );

  const handleCancelFooter = useCallback(() => {
    if (bottomSheetModalRef.current) {
      if (initialInputParamsRef.current) {
        const temp = JSON.parse(
          initialInputParamsRef.current
        ) as SelectItemOption<unknown>[];
        // printout selected options
        logger.debug(
          'handleCancelFooter options',
          latestInputParamsRef.current
        );
        onCustomDrawerResolveRef.current?.(temp);
      }
      // bottomSheetModalRef.current.dismiss();
    }
  }, [logger]);

  const handleFinishFooter = useCallback(() => {
    if (bottomSheetModalRef.current) {
      // logger.debug(
      //   `finish footer`,
      //   (latestInputParamsRef.current as SelectItemOption<unknown>[])
      //     .filter((o) => o.selected)
      //     .map((o) => o.label)
      // );
      logger.debug('finish footer', latestInputParamsRef.current);
      onCustomDrawerResolveRef.current?.(latestInputParamsRef.current);
    }
  }, [logger]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => {
      logger.debug(`renderFooter type=${footerType}`);
      if (footerType === 'confirm_cancel') {
        return (
          <ConfirmCancelFooter
            {...props}
            onCancel={handleCancelFooter}
            onFinish={handleFinishFooter}
          />
        );
      }

      return undefined;
    },
    [footerType, handleCancelFooter, handleFinishFooter, logger]
  );

  const renderHandler = useCallback(
    (props: BottomSheetHandleProps) =>
      title ? (
        <LabelHandler {...props} label={title} />
      ) : (
        <BottomSheetHandle {...props} />
      ),
    [title]
  );

  const renderBackdrop = useCallback(
    (props: CustomBackdropProps) => {
      return (
        <CustomBackdrop
          {...props}
          pressBehavior={'close'}
          onPress={() => {
            logger.debug('backdrop pressed');
            if (bottomSheetModalRef.current) {
              bottomSheetModalRef.current.dismiss();
            }
          }}
        />
      );
    },
    [logger]
  );

  const openDrawer = useCallback(
    async ({
      snapPoints: _snapPoints,
      title: _title,
      footerType: _footerType,
      initialData,
      render,
    }: {
      snapPoints?: string[];
      initialData?: unknown; // Used to restore value when cancel is pressed
      title?: string;
      footerType?: 'confirm_cancel';
      render: (_: {
        resolve?: (value: unknown) => void;
        onChange?: (value: unknown) => void;
        reject?: (error: unknown) => void;
      }) => ReactNode;
    }) => {
      if (_snapPoints) {
        setSnapPoints(_snapPoints);
      }

      if (_footerType) {
        setFooterType(_footerType);
      }

      if (_title) {
        setTitle(_title);
      }

      logger.info('openDrawer', {
        initialData,
        _snapPoints,
        _footerType,
        _title,
      });
      initialInputParamsRef.current = JSON.stringify(initialData);

      return new Promise((resolve, reject) => {
        const wrapResolve = (value: unknown) => {
          logger.log('wrapResolve', value);
          resolve(value);
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.dismiss();
          }
        };
        const wrapReject = (error: unknown) => {
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.dismiss();
          }
          reject(error);
        };

        onCustomDrawerResolveRef.current = wrapResolve;
        onCustomDrawerRejectRef.current = wrapReject;

        setDrawerContent(
          render({
            resolve: wrapResolve,
            onChange: (newValue) => {
              logger.debug(
                'onChange',
                (newValue as SelectItemOption<unknown>[])
                  .filter((o) => o.selected)
                  .map((o) => o.label)
              );
              latestInputParamsRef.current = newValue;
            },
            reject: wrapReject,
          })
        );
        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.present();
          bottomSheetModalRef.current.snapToIndex(0);
        }
      });
    },
    [logger]
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // If modal was dismissed without onFinish being called
      // if (onFinishResolveRef.current) {
      //   if (inputParams?.data) {
      //     // calling on finish with the current data
      //     onFinishResolveRef.current(inputParams?.data);
      //   }

      //   onFinishResolveRef.current = undefined;
      // }

      // if (onCustomDrawerResolveRef.current) {
      //   onCustomDrawerResolveRef.current(true);
      //   onCustomDrawerResolveRef.current = undefined;
      // }

      // Reset content
      setDrawerContent(undefined);
      setSnapPoints(defaultSnapPoints);
      setFooterType(undefined);
      setTitle(undefined);
    }
  }, []);

  return (
    <CustomBottomSheetModalContext.Provider
      value={{ dismiss, dismissAll, editProp, openDrawer }}
    >
      {children}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        // index={0}
        // snapPoints={snapPoints}
        enableDynamicSizing
        enablePanDownToClose={true}
        onChange={handleSheetChanges}
        footerComponent={renderFooter}
        handleComponent={renderHandler}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.container}>
          {drawerContent}
        </BottomSheetView>
      </BottomSheetModal>
    </CustomBottomSheetModalContext.Provider>
  );
};

export const CustomBottomSheetModal: FunctionComponent<
  CustomBottomSheetModalProps
> = ({ children }) => {
  return (
    <BottomSheetModalProvider>
      <WithProvider>{children}</WithProvider>
    </BottomSheetModalProvider>
  );
};
