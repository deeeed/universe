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
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, {
  FunctionComponent,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import { Modal, ModalProps, Portal, Text } from 'react-native-paper';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/DynInput/DynInput';
import { SelectItemOption } from '../components/SelectItems/SelectItems';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { AppTheme } from '../hooks/_useAppThemeSetup';
import { baseLogger } from '../utils/logger';
import { ThemeProvider, useTheme, useThemePreferences } from './ThemeProvider';

export type BottomSheetContainerType = 'scroll' | 'view';

export interface OpenDrawerProps {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: unknown;
  containerType?: BottomSheetContainerType;
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    resolve?: (value: unknown) => void;
    onChange?: (value: unknown) => void;
    reject?: (error: unknown) => void;
  }) => ReactNode;
}

export interface EditPropProps extends DynInputProps {
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  modalProps?: Partial<ModalProps>;
  modalType?: 'drawer' | 'modal';
}

export interface OpenModalProps {
  initialData?: DynamicType;
  modalProps?: Partial<ModalProps>;
  render: (props: {
    resolve: (value: DynamicType) => void;
    reject: (error: Error) => void;
    onChange: (value: DynamicType) => void;
  }) => ReactNode;
}

export interface CustomBottomSheetModalProviderProps {
  dismiss: () => Promise<boolean>;
  editProp: (props: EditPropProps) => Promise<DynInputProps['data']>;
  openDrawer: (props: OpenDrawerProps) => Promise<unknown>;
  dismissAll: () => void;
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
  openModal: (props: OpenModalProps) => Promise<DynamicType>;
}

export const CustomModalContext = createContext<
  CustomBottomSheetModalProviderProps | undefined
>(undefined);

interface CustomBottomSheetModalProps {
  children: ReactNode;
}

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
    },
  });
};

const logger = baseLogger.extend('CustomBottomSheetModal');

const defaultSnapPoints = ['40%', '80%'];
const defaultBottomSheetModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  snapPoints: defaultSnapPoints,
  android_keyboardInputMode: 'adjustResize',
  keyboardBehavior: 'interactive',
  keyboardBlurBehavior: 'restore',
  enablePanDownToClose: true,
  enableDismissOnClose: true,
};

type SafeModalProps = Omit<
  ModalProps,
  'visible' | 'onDismiss' | 'contentContainerStyle'
>;

const WithProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const themePreferences = useThemePreferences();
  const theme = useTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const onCustomDrawerResolveRef = useRef<(values: unknown) => void>();
  const onCustomDrawerRejectRef = useRef<(error: unknown) => void>();
  const [footerType, setFooterType] = useState<'confirm_cancel'>();
  const initialInputParamsRef = useRef<string>();
  const latestInputParamsRef = useRef<unknown>();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [title, setTitle] = useState<string>();
  const [modalProps, setModalProps] = useState<Partial<BottomSheetModalProps>>(
    defaultBottomSheetModalProps
  );

  const [modalStack, setModalStack] = useState<
    Array<{
      content: ReactNode;
      props: OpenDrawerProps;
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
    }>
  >([]);

  // const { t } = useTranslation('bottom_modal');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>();
  const onModalResolveRef = useRef<(value: DynamicType) => void>();
  const onModalRejectRef = useRef<(error: Error) => void>();
  const latestModalDataRef = useRef<DynamicType>();

  useEffect(() => {
    logger.debug(`Modal stack updated, length: ${modalStack.length}`);
  }, [modalStack]);

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
    setModalProps((prev) => ({ ...prev, enableDismissOnClose: !keyboardOpen }));
  }, [keyboardOpen]);

  useEffect(() => {
    if (!modalProps.enableDismissOnClose && keyboardOpen) {
      setTimeout(() => {
        setModalProps((prev) => ({ ...prev, enableDismissOnClose: true }));
      }, 10);
    }
  }, [modalProps.enableDismissOnClose, keyboardOpen]);

  const handleCancelFooter = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      if (initialInputParamsRef.current) {
        const initialData = JSON.parse(initialInputParamsRef.current);
        currentModal?.resolve(initialData);
      } else {
        currentModal?.reject(new Error('Cancelled'));
      }
    }
  }, [modalStack]);

  const handleFinishFooter = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      currentModal?.resolve(latestInputParamsRef.current);
    }
  }, [modalStack]);

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
    (props: BottomSheetHandleProps) => {
      return <BottomSheetHandle {...props} />;
    },
    [title]
  );

  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => {
    return (
      <BottomSheetBackdrop
        {...props}
        pressBehavior={'close'}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    );
  }, []);

  const openDrawer = useCallback(
    async (props: OpenDrawerProps): Promise<unknown> => {
      const { bottomSheetProps, footerType, title, initialData, render } =
        props;

      setModalProps((prev) => ({
        ...prev,
        ...bottomSheetProps,
        snapPoints: bottomSheetProps?.snapPoints || prev.snapPoints,
        index: bottomSheetProps?.index ?? 0,
        enableDynamicSizing:
          bottomSheetProps?.enableDynamicSizing ?? prev.enableDynamicSizing,
      }));

      if (footerType) {
        setFooterType(footerType);
      }

      if (title) {
        setTitle(title);
      }

      initialInputParamsRef.current = JSON.stringify(initialData);

      return new Promise((resolve, reject) => {
        const wrapResolve = (value: unknown) => {
          logger.debug('wrapResolve', value);
          setModalStack((prevStack) => {
            const newStack = prevStack.slice(0, -1);
            if (newStack.length > 0) {
              bottomSheetModalRef.current?.present();
            }
            return newStack;
          });
          resolve(value);
        };
        const wrapReject = (error: unknown) => {
          setModalStack((prevStack) => {
            const newStack = prevStack.slice(0, -1);
            if (newStack.length > 0) {
              bottomSheetModalRef.current?.present();
            }
            return newStack;
          });
          reject(error);
        };

        onCustomDrawerResolveRef.current = wrapResolve;
        onCustomDrawerRejectRef.current = wrapReject;

        const content = (
          <CustomModalContext.Provider
            value={{
              dismiss,
              dismissAll,
              editProp,
              openDrawer,
              openModal,
              bottomSheetModalRef: bottomSheetModalRef,
            }}
          >
            {render({
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
            })}
          </CustomModalContext.Provider>
        );
        setModalStack((prevStack) => [
          ...prevStack,
          { content, props, resolve: wrapResolve, reject: wrapReject },
        ]);

        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.present();
          bottomSheetModalRef.current.snapToIndex(modalProps.index || 0);
        }
      });
    },
    [logger]
  );

  const openModal = useCallback(
    async (props: OpenModalProps): Promise<DynamicType> => {
      const { initialData, modalProps: modalProperties, render } = props;

      latestModalDataRef.current = initialData;

      return new Promise<DynamicType>((resolve, reject) => {
        const wrapResolve = (value: DynamicType) => {
          logger.debug('modal wrapResolve', value);
          resolve(value);
          setModalVisible(false);
        };
        const wrapReject = (error: Error) => {
          logger.debug('modal wrapReject', error);
          reject(error);
          setModalVisible(false);
        };
        const wrapOnChange = (value: DynamicType) => {
          logger.debug('modal onChange', value);
          latestModalDataRef.current = value;
        };

        onModalResolveRef.current = wrapResolve;
        onModalRejectRef.current = wrapReject;

        setModalContent(
          render({
            resolve: wrapResolve,
            reject: wrapReject,
            onChange: wrapOnChange,
          })
        );
        setModalProps(modalProperties || {});
        setModalVisible(true);
      });
    },
    [logger]
  );

  const handleModalDismiss = useCallback(() => {
    setModalVisible(false);
    onModalRejectRef.current?.(new Error('Modal dismissed'));
  }, []);

  const handleSheetChanges = useCallback(
    (index: number) => {
      logger.debug(
        `handleSheetChanges index=${index} modalStack=${modalStack.length}`
      );
      if (index === -1 && modalStack.length > 0) {
        const currentModal = modalStack[modalStack.length];
        currentModal?.resolve(undefined);
        setModalStack((prevStack) => {
          const newStack = prevStack.slice(0, -1);
          if (newStack.length > 0) {
            // Present the previous modal
            setTimeout(() => {
              bottomSheetModalRef.current?.present();
            }, 0);
          }
          return newStack;
        });
      }
    },
    [modalStack]
  );

  const editProp = useCallback(
    async (props: EditPropProps): Promise<DynamicType> => {
      logger.debug('editProp', props);
      const {
        bottomSheetProps,
        modalProps,
        modalType = Platform.OS === 'web' ? 'modal' : 'drawer',
        data,
        ...restProps
      } = props;

      if (modalType === 'modal') {
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
                resolve(data); // restore initial data
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
          enableDynamicSizing: bottomSheetProps?.enableDynamicSizing ?? false,
          snapPoints: bottomSheetProps?.enableDynamicSizing
            ? []
            : bottomSheetProps?.snapPoints || defaultSnapPoints,
          index: bottomSheetProps?.index ?? 0,
        },
        containerType: 'view',
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
              resolve?.(data); // restore initial data
            }}
            onFinish={(values) => {
              resolve?.(values);
            }}
          />
        ),
      }) as Promise<DynamicType>;
    },
    [logger, openModal, openDrawer]
  );

  const renderContent = useCallback(() => {
    const currentModal = modalStack[modalStack.length - 1];
    if (!currentModal) return null;

    const { content, props } = currentModal;
    const { containerType } = props;
    const ContainerComponent =
      containerType === 'scroll' ? BottomSheetScrollView : BottomSheetView;

    return (
      <ContainerComponent
        style={containerType === 'view' ? styles.container : undefined}
        contentContainerStyle={
          containerType === 'scroll' ? styles.container : undefined
        }
      >
        {content}
      </ContainerComponent>
    );
  }, [modalStack]);

  const dismiss = useCallback(() => {
    logger.debug(
      `dismiss called, current modalStack length: ${modalStack.length}`
    );

    return new Promise<boolean>((resolvePromise) => {
      setModalStack((prevStack) => {
        logger.debug(`dismiss: prevStack length: ${prevStack.length}`);
        if (prevStack.length === 0) {
          logger.debug('dismiss: Stack is already empty');
          resolvePromise(false);
          return prevStack;
        }

        const currentModal = prevStack[prevStack.length - 1];
        currentModal?.resolve(undefined);

        const newStack = prevStack.slice(0, -1);
        logger.debug(`dismiss: newStack length: ${newStack.length}`);

        if (newStack.length > 0) {
          logger.debug('dismiss: Presenting previous modal');
          setTimeout(() => {
            bottomSheetModalRef.current?.present();
          }, 0);
        } else {
          logger.debug('dismiss: Dismissing bottom sheet');
          bottomSheetModalRef.current?.dismiss();
        }

        resolvePromise(true);
        return newStack;
      });
    });
  }, [modalStack, logger]);

  const dismissAll = useCallback(() => {
    logger.debug(`dismissAll called modalStack=${modalStack.length}`);
    setModalStack([]);
    bottomSheetModalRef.current?.dismiss();
  }, [modalStack]);

  return (
    <CustomModalContext.Provider
      value={{
        dismiss,
        dismissAll,
        editProp,
        openDrawer,
        openModal,
        bottomSheetModalRef: bottomSheetModalRef,
      }}
    >
      {children}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        {...modalProps}
        onChange={handleSheetChanges}
        footerComponent={renderFooter}
        handleComponent={renderHandler}
        backdropComponent={renderBackdrop}
      >
        <Text>Stack: {modalStack.length}</Text>
        {renderContent()}
      </BottomSheetModal>
      {Platform.OS === 'web' || Platform.OS === 'ios' ? (
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={handleModalDismiss}
            contentContainerStyle={{
              backgroundColor: theme.colors.surface,
              padding: 20,
              borderRadius: 8,
              margin: 20,
            }}
            {...(modalProps as SafeModalProps)}
          >
            <ThemeProvider preferences={themePreferences}>
              {modalContent}
            </ThemeProvider>
          </Modal>
        </Portal>
      ) : (
        <Portal>
          <ThemeProvider preferences={themePreferences}>
            <Modal
              visible={modalVisible}
              onDismiss={handleModalDismiss}
              contentContainerStyle={{
                backgroundColor: theme.colors.surface,
                padding: 20,
                borderRadius: 8,
                margin: 20,
              }}
              {...(modalProps as SafeModalProps)}
            >
              {modalContent}
            </Modal>
          </ThemeProvider>
        </Portal>
      )}
    </CustomModalContext.Provider>
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
