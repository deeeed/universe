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
  SNAP_POINT_TYPE,
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
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { Modal, ModalProps, Portal } from 'react-native-paper';
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/DynInput/DynInput';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { LabelHandler } from '../components/bottom-modal/handlers/LabelHandler';
import { AppTheme } from '../hooks/_useAppThemeSetup';
import { baseLogger } from '../utils/logger';
import { ThemeProvider, useTheme, useThemePreferences } from './ThemeProvider';

export type BottomSheetContainerType = 'scroll' | 'view';

export interface OpenDrawerProps<T = unknown> {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: unknown;
  containerType?: BottomSheetContainerType;
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    resolve?: (value: T) => void;
    onChange?: (value: T) => void;
    reject?: (error: Error) => void;
  }) => ReactNode;
  renderFooter?: (props: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    data: T;
    footerComponent?: ReactNode;
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
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: 20,
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
  const initialInputParamsRef = useRef<string>();
  const latestInputParamsRef = useRef<unknown>();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [footerHeight, setFooterHeight] = useState(0);
  const [modalProps, setModalProps] = useState<Partial<BottomSheetModalProps>>(
    defaultBottomSheetModalProps
  );

  const [modalStack, setModalStack] = useState<
    Array<{
      content: ReactNode;
      props: OpenDrawerProps;
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      renderFooter?: (props: {
        data: unknown;
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
        footerComponent?: ReactNode;
      }) => ReactNode;
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
      const currentModal = modalStack[modalStack.length - 1];
      if (!currentModal) return null;

      const { renderFooter: customRenderFooter, footerType } =
        currentModal.props;

      if (customRenderFooter) {
        return customRenderFooter({
          resolve: currentModal.resolve,
          reject: currentModal.reject,
          data: latestInputParamsRef.current,
          footerComponent: (
            <View
              onLayout={(event) =>
                setFooterHeight(event.nativeEvent.layout.height)
              }
            >
              {footerType === 'confirm_cancel' ? (
                <ConfirmCancelFooter
                  {...props}
                  onCancel={handleCancelFooter}
                  onFinish={handleFinishFooter}
                />
              ) : null}
            </View>
          ),
        });
      }

      return null;
    },
    [modalStack, handleCancelFooter, handleFinishFooter]
  );

  const renderHandler = useCallback(
    (props: BottomSheetHandleProps) => {
      // get title from modalStack
      const currentModal = modalStack[modalStack.length - 1];
      const title = currentModal?.props.title;
      if (title) {
        return <LabelHandler {...props} label={title} />;
      }
      return (
        <BottomSheetHandle
          {...props}
          // style={{ backgroundColor: theme.colors.surfaceVariant }}
          // indicatorStyle={{ backgroundColor: theme.colors.text }}
        />
      );
    },
    [modalStack]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => {
      return (
        <BottomSheetBackdrop
          {...props}
          pressBehavior={'close'}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      );
    },
    [modalStack]
  );

  const openDrawer = useCallback(
    async (props: OpenDrawerProps): Promise<unknown> => {
      const { bottomSheetProps, initialData, render } = props;

      const enableDynamicSizing = bottomSheetProps?.enableDynamicSizing ?? true;
      setModalProps((prev) => ({
        ...prev,
        ...bottomSheetProps,
        snapPoints: enableDynamicSizing
          ? []
          : bottomSheetProps?.snapPoints || prev.snapPoints,
        index: bottomSheetProps?.index ?? 0,
        enableDynamicSizing,
      }));

      initialInputParamsRef.current = JSON.stringify(initialData);

      return new Promise((resolve, reject) => {
        const wrapResolve = (value: unknown) => {
          logger.debug('openDrawer wrapResolve', value);
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
          logger.debug('openDrawer wrapReject', error);
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
          <View
            style={{
              // marginBottom: insets.bottom,
              backgroundColor: 'red',
            }}
          >
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
                  logger.debug('onChange', newValue);
                  latestInputParamsRef.current = newValue;
                },
                reject: wrapReject,
              })}
            </CustomModalContext.Provider>
          </View>
        );
        setModalStack((prevStack) => [
          ...prevStack,
          {
            content,
            props,
            resolve: wrapResolve,
            reject: wrapReject,
            renderFooter: props.renderFooter,
          },
        ]);

        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.present();
          bottomSheetModalRef.current.snapToIndex(modalProps.index || 0);
        }
      });
    },
    [footerHeight]
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
  }, [modalStack, footerHeight]);

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

  const handleSheetChanges = useCallback(
    (index: number, position: number, type: SNAP_POINT_TYPE) => {
      logger.debug(
        `handleSheetChanges index=${index} modalStack=${modalStack.length}`
      );
      const currentModal = modalStack[modalStack.length];

      // Propagate the event if it exists
      currentModal?.props.bottomSheetProps?.onChange?.(index, position, type);

      if (index === -1) {
        dismissAll();
      }
    },
    [modalStack, dismissAll]
  );

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
        enableDynamicSizing
        footerComponent={renderFooter}
        // footerComponent={modalProps.footerComponent}
        handleComponent={
          modalProps.handleComponent !== undefined
            ? modalProps.handleComponent
            : renderHandler
        }
        backdropComponent={
          modalProps.backdropComponent !== undefined
            ? modalProps.backdropComponent
            : renderBackdrop
        }
        // bottomInset={insets.bottom}
      >
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
