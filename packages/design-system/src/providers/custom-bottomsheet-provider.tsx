import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
  BottomSheetHandle,
  BottomSheetHandleProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useLogger } from '@siteed/react-native-logger';
import React, {
  FunctionComponent,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/confirm-cancel-footer';
import { LabelHandler } from '../components/bottom-modal/handlers/label-handler';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/dyn-input/dyn-input';
import { SelectItemOption } from '../components/select-items/select-items';

export interface OpenDrawerProps {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: unknown;
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    resolve?: (value: unknown) => void;
    onChange?: (value: unknown) => void;
    reject?: (error: unknown) => void;
  }) => ReactNode;
}

export interface EditPropProps extends DynInputProps {
  bottomSheetProps?: Partial<BottomSheetModalProps>;
}

export interface CustomBottomSheetModalProviderProps {
  dismiss: (key?: string) => boolean;
  editProp: (props: EditPropProps) => Promise<DynInputProps['data']>;
  openDrawer: (props: OpenDrawerProps) => Promise<unknown>;
  dismissAll: () => void;
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
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
    // paddingBottom: 40,
  },
});

const defaultSnapPoints = ['40%', '80%'];

const WithProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const { dismiss, dismissAll } = useBottomSheetModal();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [_snapPoints, setSnapPoints] = useState<
    (string | number)[] | SharedValue<(string | number)[]>
  >(defaultSnapPoints);
  const [_enableDynamicSizing, setEnableDynamicSizing] = useState(true);
  const { logger } = useLogger('CustomBottomSheetModalProvider');
  const onFinishResolveRef = useRef<(values: DynInputProps['data']) => void>();
  const onCustomDrawerResolveRef = useRef<(values: unknown) => void>();
  const onCustomDrawerRejectRef = useRef<(error: unknown) => void>();
  const [drawerContent, setDrawerContent] = useState<ReactNode>();
  const [footerType, setFooterType] = useState<'confirm_cancel'>();
  const [title, setTitle] = useState<string>();
  const [index, setIndex] = useState<number>(0);
  const initialInputParamsRef = useRef<string>();
  const latestInputParamsRef = useRef<unknown>();
  // const { t } = useTranslation('bottom_modal');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [enableDismissOnClose, setEnableDismissOnClose] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardOpen(true)
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardOpen(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    setEnableDismissOnClose(!keyboardOpen);
  }, [keyboardOpen]);

  useEffect(() => {
    if (!enableDismissOnClose && keyboardOpen) {
      setTimeout(() => {
        setEnableDismissOnClose(true);
      }, 10);
    }
  }, [enableDismissOnClose, keyboardOpen]);

  const editProp = useCallback(
    async (props: EditPropProps): Promise<DynInputProps['data']> => {
      const { bottomSheetProps } = props;
      const { snapPoints, index, enableDynamicSizing } = bottomSheetProps || {};

      setEnableDynamicSizing(enableDynamicSizing ?? false);
      if (enableDynamicSizing) {
        setSnapPoints([]);
        setIndex(0);
        logger.debug('Dynamic sizing enabled, snap points and index reset.');
      } else {
        if (snapPoints) {
          setSnapPoints(snapPoints);
          logger.debug('Snap points set:', snapPoints);
        }
        if (index !== undefined) {
          setIndex(index);
          logger.debug('Index set:', index);
        }
      }
      const newInputParams: DynInputProps = {
        ...props,
        useFlatList: false,
        onCancel: () => {
          logger.debug('onCancel', bottomSheetModalRef.current);
          bottomSheetModalRef.current?.dismiss();
          onFinishResolveRef.current?.(props.data);
          onFinishResolveRef.current = undefined;
          setDrawerContent(null);
          logger.debug('Drawer content reset on cancel.');
        },
        onFinish: (values: DynamicType) => {
          onFinishResolveRef.current?.(values);
          onFinishResolveRef.current = undefined;
          bottomSheetModalRef.current?.dismiss();
          setDrawerContent(null);
          logger.debug('Drawer content reset on finish.');
        },
      };

      logger.debug('editProp', props, newInputParams);
      setDrawerContent(<DynInput {...newInputParams} />);

      logger.debug('Presenting modal');
      bottomSheetModalRef.current?.present();

      return new Promise((resolve) => {
        onFinishResolveRef.current = resolve;
      });
    },
    [setEnableDynamicSizing, setSnapPoints, logger]
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
    (props: BottomSheetBackdropProps) => {
      console.log(`backdrop prods`, props);
      return (
        <BottomSheetBackdrop
          {...props}
          pressBehavior={'close'}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      );
    },
    [logger]
  );

  const openDrawer = useCallback(
    async (props: OpenDrawerProps) => {
      const { bottomSheetProps, footerType, title, initialData, render } =
        props;
      const { snapPoints, index, enableDynamicSizing } = bottomSheetProps || {};

      if (_snapPoints) {
        setSnapPoints(_snapPoints);
      }

      if (enableDynamicSizing) {
        setEnableDynamicSizing(enableDynamicSizing);
        setSnapPoints([]);
        setIndex(0);
      } else {
        if (snapPoints) {
          setSnapPoints(snapPoints);
        }
        if (index) {
          setIndex(index);
        }
      }

      if (footerType) {
        setFooterType(footerType);
      }

      if (title) {
        setTitle(title);
      }

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
          bottomSheetModalRef.current.snapToIndex(index || 0);
        }
      });
    },
    [logger]
  );

  const handleSheetChanges = useCallback((index: number) => {
    logger.debug(`handleSheetChanges called with index:`, index);
    if (index === -1) {
      // // If modal was dismissed without onFinish being called
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

      // Reset content
      setDrawerContent(undefined);
      setSnapPoints(defaultSnapPoints);
      setFooterType(undefined);
      setTitle(undefined);

      // Reset the resolve and reject refs
      onFinishResolveRef.current = undefined;
      onCustomDrawerResolveRef.current = undefined;
      onCustomDrawerRejectRef.current = undefined;
    }
  }, []);

  console.log(
    `enableDynamicSizing=${_enableDynamicSizing} snappoints`,
    _snapPoints,
    drawerContent
  );
  return (
    <CustomBottomSheetModalContext.Provider
      value={{
        dismiss,
        dismissAll,
        editProp,
        openDrawer,
        bottomSheetModalRef: bottomSheetModalRef,
      }}
    >
      {children}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={index}
        snapPoints={_snapPoints}
        android_keyboardInputMode="adjustResize"
        enableDynamicSizing={_enableDynamicSizing}
        enablePanDownToClose={true}
        enableDismissOnClose={enableDismissOnClose}
        onChange={handleSheetChanges}
        footerComponent={renderFooter}
        keyboardBlurBehavior="restore"
        handleComponent={renderHandler}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView style={styles.container}>
          {drawerContent}
        </BottomSheetScrollView>
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
