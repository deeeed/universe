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
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { LabelHandler } from '../components/bottom-modal/handlers/LabelHandler';
import { baseLogger } from '../utils/logger';

export interface ModalStackItem<T = unknown> {
  id: number;
  render: OpenDrawerProps<T>['render']; // Store the render function
  props: OpenDrawerProps<T>;
  resolve: (value: T | undefined) => void;
  reject: (error: Error) => void;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  initialData: T;
  latestData: T;
}

export interface OpenDrawerProps<T> {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: T;
  containerType?: 'view' | 'scrollview' | 'none';
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    footerHeight?: number;
    resolve?: (value: T | undefined) => void;
    onChange?: (value: T) => void;
    reject?: (error: Error) => void;
  }) => React.ReactNode;
}

export interface BottomSheetProviderProps {
  openDrawer: <T>(props: OpenDrawerProps<T>) => Promise<T | undefined>;
  dismiss: () => Promise<boolean>;
  dismissAll: () => void;
  modalStack: ModalStackItem[];
}

export const BottomSheetContext = createContext<
  BottomSheetProviderProps | undefined
>(undefined);

const logger = baseLogger.extend('BottomSheetProvider');

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

export const BottomSheetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [footerHeight, setFooterHeight] = useState(0);
  const [modalStack, setModalStack] = useState<Array<ModalStackItem>>([]);
  const modalIdCounter = useRef(0);

  const renderFooter = useCallback(
    ({ modalIndex }: { modalIndex: number }) => {
      const FooterComponent = (props: BottomSheetFooterProps) => {
        const modal = modalStack[modalIndex];
        if (!modal) return null;

        const { footerType, bottomSheetProps } = modal.props;
        const footerComponent = bottomSheetProps?.footerComponent;

        if (!footerType && !footerComponent) return null;

        return (
          <View
            onLayout={(event) =>
              setFooterHeight(event.nativeEvent.layout.height)
            }
          >
            {footerComponent ? (
              footerComponent(props)
            ) : (
              <ConfirmCancelFooter {...props} />
            )}
          </View>
        );
      };
      FooterComponent.displayName = 'BottomSheetFooter';
      return FooterComponent;
    },
    [modalStack, setFooterHeight]
  );

  const renderHandler = useCallback(
    ({ modalIndex }: { modalIndex: number }) => {
      const HandlerComponent = (props: BottomSheetHandleProps) => {
        const modal = modalStack[modalIndex];
        if (!modal) return null;

        const title = modal.props.title;
        if (title) {
          return <LabelHandler {...props} label={title} />;
        }
        return <BottomSheetHandle {...props} />;
      };
      HandlerComponent.displayName = 'BottomSheetHandler';
      return HandlerComponent;
    },
    [modalStack]
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
    async <T,>(props: OpenDrawerProps<T>): Promise<T | undefined> => {
      const newBottomSheetRef = React.createRef<BottomSheetModal>();

      return new Promise((resolve, reject) => {
        const { initialData, bottomSheetProps } = props;

        const modalId = modalIdCounter.current++;

        const wrapResolve = (value: T | undefined) => {
          logger.debug('openDrawer wrapResolve', value);
          setModalStack((prevStack) => {
            const newStack = prevStack.filter((modal) => modal.id !== modalId);
            if (newStack.length > 0) {
              newStack[newStack.length - 1]?.bottomSheetRef.current?.present();
            }
            return newStack;
          });
          resolve(value);
        };
        const wrapReject = (error: Error) => {
          logger.debug('openDrawer wrapReject', error);
          setModalStack((prevStack) => {
            const newStack = prevStack.filter((modal) => modal.id !== modalId);
            if (newStack.length > 0) {
              newStack[newStack.length - 1]?.bottomSheetRef.current?.present();
            }
            return newStack;
          });
          reject(error);
        };

        setModalStack((prevStack) => [
          ...prevStack,
          {
            id: modalId,
            render: props.render,
            props,
            resolve: wrapResolve,
            reject: wrapReject,
            bottomSheetRef: newBottomSheetRef,
            initialData,
            latestData: initialData,
          } as ModalStackItem,
        ]);

        setTimeout(() => {
          newBottomSheetRef.current?.present();
          if (bottomSheetProps?.snapPoints) {
            newBottomSheetRef.current?.snapToIndex(bottomSheetProps.index || 0);
          }
        }, 0);
      });
    },
    [footerHeight, setModalStack]
  );

  const dismiss = useCallback(() => {
    return new Promise<boolean>((resolvePromise) => {
      if (modalStack.length === 0) {
        resolvePromise(false);
        return;
      }

      const currentModal = modalStack[modalStack.length - 1];

      // Dismiss the current modal
      currentModal?.bottomSheetRef.current?.dismiss();

      // Resolve the promise after a short delay to allow for animation
      setTimeout(() => {
        currentModal?.resolve(undefined);
        resolvePromise(true);
      }, 300); // Adjust this delay if needed
    });
  }, [modalStack]);

  const dismissAll = useCallback(() => {
    modalStack.forEach((modal) => {
      modal.bottomSheetRef.current?.dismiss();
    });
    setModalStack([]);
  }, [modalStack]);

  const handleSheetChanges = useCallback(
    ({
      modalIndex,
      index,
      position,
      type,
    }: {
      modalIndex: number;
      index: number;
      position: number;
      type: SNAP_POINT_TYPE;
    }) => {
      if (index === -1) {
        // Modal is dismissed
        setModalStack((prevStack) => {
          const modalToRemove = prevStack[modalIndex];
          if (!modalToRemove) return prevStack;

          const newStack = prevStack.filter((_, idx) => idx !== modalIndex);

          // Resolve the promise for the dismissed modal
          setTimeout(() => {
            modalToRemove.resolve(modalToRemove.latestData);
          }, 300); // Adjust this delay if needed

          if (newStack.length > 0) {
            setTimeout(() => {
              newStack[newStack.length - 1]?.bottomSheetRef.current?.present();
            }, 0);
          }

          return newStack;
        });
      } else {
        // Handle other changes if necessary
        const currentModal = modalStack[modalIndex];
        currentModal?.props.bottomSheetProps?.onChange?.(index, position, type);
      }
    },
    [modalStack, setModalStack]
  );

  const updateLatestData = useCallback(
    <T,>(modalId: number, newValue: T) => {
      setModalStack((prevStack) =>
        prevStack.map((modal) =>
          modal.id === modalId
            ? ({ ...modal, latestData: newValue } as ModalStackItem)
            : modal
        )
      );
    },
    [setModalStack]
  );

  const renderContent = useCallback(
    ({ modelIndex }: { modelIndex: number }) => {
      const currentModal = modalStack[modelIndex];
      if (!currentModal) return null;

      const containerType = currentModal.props.containerType || 'view';
      const Container =
        containerType === 'view'
          ? BottomSheetView
          : containerType === 'scrollview'
            ? BottomSheetScrollView
            : React.Fragment;

      const content = currentModal.render({
        footerHeight,
        resolve: currentModal.resolve,
        onChange: (newValue) => {
          updateLatestData(currentModal.id, newValue);
        },
        reject: currentModal.reject,
      });

      return <Container>{content}</Container>;
    },
    [modalStack, footerHeight]
  );

  const contextValue = useMemo(
    () => ({
      openDrawer,
      dismiss,
      dismissAll,
      modalStack,
    }),
    [openDrawer, dismiss, dismissAll, modalStack]
  );

  return (
    <BottomSheetContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        {children}
        {modalStack.map((modal, index) => (
          <BottomSheetModal
            key={modal.id}
            ref={modal.bottomSheetRef}
            {...defaultBottomSheetModalProps}
            {...modal.props.bottomSheetProps}
            onChange={(sheetIndex, position, type) =>
              handleSheetChanges({
                modalIndex: index,
                index: sheetIndex,
                position,
                type,
              })
            }
            stackBehavior="push"
            footerComponent={renderFooter({ modalIndex: index })}
            handleComponent={renderHandler({ modalIndex: index })}
            backdropComponent={renderBackdrop}
          >
            {renderContent({ modelIndex: index })}
          </BottomSheetModal>
        ))}
      </BottomSheetModalProvider>
    </BottomSheetContext.Provider>
  );
};
