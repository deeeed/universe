// packages/design-system/src/providers/CustomBottomSheetProvider.tsx
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
  useBottomSheetModal,
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
import {
  DynInput,
  DynInputProps,
  DynamicType,
} from '../components/DynInput/DynInput';
import { SelectItemOption } from '../components/SelectItems/SelectItems';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { AppTheme } from '../hooks/_useAppThemeSetup';
import { baseLogger } from '../utils/logger';
import { useTheme } from './ThemeProvider';

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

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexGrow: 1,
      flexShrink: 1,
      backgroundColor: theme.colors.surface,
    },
  });
};

const logger = baseLogger.extend('CustomBottomSheetModal');

const defaultSnapPoints = ['40%', '80%'];
const defaultModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  snapPoints: defaultSnapPoints,
  android_keyboardInputMode: 'adjustResize',
  keyboardBehavior: 'interactive',
  keyboardBlurBehavior: 'restore',
  enablePanDownToClose: true,
  enableDismissOnClose: true,
};

const WithProvider: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const { dismiss, dismissAll } = useBottomSheetModal();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const onFinishResolveRef = useRef<(values: DynInputProps['data']) => void>();
  const onCustomDrawerResolveRef = useRef<(values: unknown) => void>();
  const onCustomDrawerRejectRef = useRef<(error: unknown) => void>();
  const [drawerContent, setDrawerContent] = useState<ReactNode>();
  const [footerType, setFooterType] = useState<'confirm_cancel'>();
  const initialInputParamsRef = useRef<string>();
  const latestInputParamsRef = useRef<unknown>();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [title, setTitle] = useState<string>();
  const [containerType, setContainerType] =
    useState<BottomSheetContainerType>('scroll');
  const [modalProps, setModalProps] =
    useState<Partial<BottomSheetModalProps>>(defaultModalProps);

  // const { t } = useTranslation('bottom_modal');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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

  const editProp = useCallback(
    async (props: EditPropProps): Promise<DynInputProps['data']> => {
      logger.debug('editProp', props);
      const { bottomSheetProps } = props;

      setContainerType('view');

      setModalProps((prev) => ({
        ...prev,
        ...bottomSheetProps,
        enableDynamicSizing: bottomSheetProps?.enableDynamicSizing ?? false,
        snapPoints: bottomSheetProps?.enableDynamicSizing
          ? []
          : bottomSheetProps?.snapPoints || prev.snapPoints,
        index: bottomSheetProps?.index ?? 0,
      }));

      const newInputParams: DynInputProps = {
        ...props,
        useFlatList: false,
        autoFocus: true,
        withinBottomSheet: true,
        onCancel: () => {
          logger.debug('onCancel', bottomSheetModalRef.current);
          bottomSheetModalRef.current?.close();
          onFinishResolveRef.current?.(props.data);
          onFinishResolveRef.current = undefined;
          setDrawerContent(null);
        },
        onFinish: (values: DynamicType) => {
          logger.debug('onFinish', values);
          bottomSheetModalRef.current?.close();
          onFinishResolveRef.current?.(values);
          onFinishResolveRef.current = undefined;
          setDrawerContent(null);
        },
      };

      logger.debug('newInputParams', newInputParams);
      setDrawerContent(<DynInput {...newInputParams} />);

      bottomSheetModalRef.current?.present();

      return new Promise((resolve) => {
        onFinishResolveRef.current = resolve;
      });
    },
    [logger]
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
      // bottomSheetModalRef.current.close();
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
    async (props: OpenDrawerProps) => {
      const {
        bottomSheetProps,
        footerType,
        title,
        containerType = 'scroll',
        initialData,
        render,
      } = props;

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

      setContainerType(containerType);

      initialInputParamsRef.current = JSON.stringify(initialData);

      return new Promise((resolve, reject) => {
        const wrapResolve = (value: unknown) => {
          logger.debug('wrapResolve', value);
          resolve(value);
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.close();
          }
        };
        const wrapReject = (error: unknown) => {
          if (bottomSheetModalRef.current) {
            bottomSheetModalRef.current.close();
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
          bottomSheetModalRef.current.snapToIndex(modalProps.index || 0);
        }
      });
    },
    [logger]
  );

  const handleDismiss = useCallback(() => {
    logger.debug(`handleDismiss called`);
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    logger.debug(`handleSheetChanges called with index:`, index);
    if (index === -1) {
      // Reset content
      setDrawerContent(undefined);
      setFooterType(undefined);
      setTitle(undefined);

      // Reset the resolve and reject refs
      onFinishResolveRef.current = undefined;
      onCustomDrawerResolveRef.current = undefined;
      onCustomDrawerRejectRef.current = undefined;
    }
  }, []);

  const renderContent = useCallback(() => {
    switch (containerType) {
      case 'view':
        return (
          <BottomSheetView style={styles.container}>
            {drawerContent}
          </BottomSheetView>
        );
      case 'scroll':
      default:
        return (
          <BottomSheetScrollView contentContainerStyle={styles.container}>
            {drawerContent}
          </BottomSheetScrollView>
        );
    }
  }, [containerType, drawerContent, styles.container]);

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
        {...modalProps}
        onDismiss={handleDismiss}
        onChange={handleSheetChanges}
        footerComponent={renderFooter}
        handleComponent={renderHandler}
        backdropComponent={renderBackdrop}
      >
        {renderContent()}
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
