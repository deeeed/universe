import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
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
import { Portal } from '@gorhom/portal';
import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { LabelHandler } from '../components/bottom-modal/handlers/LabelHandler';
import { baseLogger } from '../utils/logger';

export interface BottomSheetStackItem<T = unknown> {
  id: number;
  render: OpenDrawerProps<T>['render']; // Store the render function
  props: OpenDrawerProps<T>;
  resolve: (value: T | undefined) => void;
  reject: (error: Error) => void;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  initialData: T;
  latestData: T;
  resolved: boolean;
  rejected: boolean;
}

export interface OpenDrawerProps<T> {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: T;
  containerType?: 'view' | 'scrollview' | 'none';
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    data: T;
    footerHeight: number;
    resolve: (value: T | undefined) => void;
    onChange: (value: T) => void;
    reject: (error: Error) => void;
  }) => React.ReactNode;
  renderHandler?: (
    props: {
      data: T;
      resolve: (value: T | undefined) => void;
      onChange: (value: T) => void;
      reject: (error: Error) => void;
    } & BottomSheetHandleProps
  ) => React.ReactNode;
  renderFooter?: (
    props: {
      data: T;
      resolve: (value: T | undefined) => void;
      onChange: (value: T) => void;
      reject: (error: Error) => void;
    } & BottomSheetFooterProps
  ) => React.ReactNode;
}

export interface BottomSheetProviderProps {
  openDrawer: <T>(props: OpenDrawerProps<T>) => Promise<T | undefined>;
  dismiss: () => Promise<boolean>;
  dismissAll: () => void;
  modalStack: BottomSheetStackItem[];
}

export const BottomSheetContext = createContext<
  BottomSheetProviderProps | undefined
>(undefined);

const logger = baseLogger.extend('BottomSheetProvider');

const defaultSnapPoints = ['40%', '80%'];
const defaultBottomSheetModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  snapPoints: [],
  android_keyboardInputMode: 'adjustResize',
  keyboardBehavior: 'interactive',
  keyboardBlurBehavior: 'restore',
  enablePanDownToClose: true,
  enableDismissOnClose: true,
};

export const BottomSheetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [modalStack, setModalStack] = useState<Array<BottomSheetStackItem>>([]);
  const modalIdCounter = useRef(0);
  const [footerHeights, setFooterHeights] = useState<Record<number, number>>(
    {}
  );

  const updateLatestData = useCallback(<T,>(modalId: number, newValue: T) => {
    setModalStack((prevStack) =>
      prevStack.map((modal) =>
        modal.id === modalId
          ? ({ ...modal, latestData: newValue } as BottomSheetStackItem)
          : modal
      )
    );
  }, []);

  const updateFooterHeight = useCallback(
    (modalId: number, newHeight: number) => {
      setFooterHeights((prevHeights) => {
        if (prevHeights[modalId] !== newHeight) {
          return { ...prevHeights, [modalId]: newHeight };
        }
        return prevHeights;
      });
    },
    []
  );

  const renderFooter = useCallback(
    ({
      modalIndex,
      footerProps,
    }: {
      modalIndex: number;
      footerProps: BottomSheetFooterProps;
    }) => {
      const modal = modalStack[modalIndex];
      if (!modal) return null;

      const { renderFooter, footerType } = modal.props;

      if (!renderFooter && !footerType) return null;

      return (
        <BottomSheetFooter {...footerProps}>
          <View
            onLayout={(event) => {
              if (modalIndex === modalStack.length - 1) {
                const newHeight = event.nativeEvent.layout.height;
                updateFooterHeight(modal.id, newHeight);
              }
            }}
          >
            {!renderFooter && footerType === 'confirm_cancel' && (
              <ConfirmCancelFooter
                onFinish={() => {
                  modal.resolve(modal.latestData);
                }}
                onCancel={() => {
                  modal.resolve(modal.initialData);
                }}
              />
            )}
            {renderFooter &&
              renderFooter({
                ...footerProps,
                data: modal.latestData,
                resolve: modal.resolve,
                onChange: (newValue) => updateLatestData(modal.id, newValue),
                reject: modal.reject,
              })}
          </View>
        </BottomSheetFooter>
      );
    },
    [modalStack, updateFooterHeight, updateLatestData]
  );

  const renderHandler = useCallback(
    ({ modalIndex }: { modalIndex: number }) => {
      const HandlerComponent = (props: BottomSheetHandleProps) => {
        const modal = modalStack[modalIndex];
        if (!modal) return null;

        const { renderHandler, title } = modal.props;

        if (renderHandler) {
          return renderHandler({
            ...props,
            data: modal.latestData,
            resolve: modal.resolve,
            onChange: (newValue) => updateLatestData(modal.id, newValue),
            reject: modal.reject,
          });
        }

        if (title) {
          return <LabelHandler {...props} label={title} />;
        }

        return <BottomSheetHandle {...props} />;
      };
      HandlerComponent.displayName = 'BottomSheetHandler';
      return HandlerComponent;
    },
    [modalStack, updateLatestData]
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
        let modalResolved = false;

        const wrapResolve = (value: T | undefined) => {
          logger.debug('openDrawer wrapResolve', value);

          setModalStack((prevStack) => {
            logger.debug(
              `wrapResolve setModalStack called, finding modal id ${modalId} in prevStack: `,
              prevStack
            );
            const currentModal = prevStack.find(
              (modal) => modal.id === modalId
            );

            logger.debug(
              `wrapResolve setModalStack called, modalId=${modalId} rejected: ${currentModal?.rejected} resolved: ${currentModal?.resolved}`,
              currentModal
            );
            if (
              currentModal &&
              !currentModal.resolved &&
              !currentModal.rejected
            ) {
              logger.debug('wrapResolve resolving modal:', modalId);
              const newStack = prevStack
                .map((modal) =>
                  modal.id === modalId ? { ...modal, resolved: true } : modal
                )
                .filter((modal) => modal.id !== modalId);
              logger.debug(`wrapResolve new stack length: ${newStack.length}`);
              return newStack;
            } else {
              logger.debug(
                'wrapResolve modal already resolved or rejected:',
                modalId
              );
              return prevStack;
            }
          });

          if (!modalResolved) {
            logger.debug('Calling resolve function');
            modalResolved = true;
            resolve(value);
          } else {
            logger.debug('Resolve already called, skipping');
          }
        };

        const wrapReject = (error: Error) => {
          logger.debug('openDrawer wrapReject', error);
          setModalStack((prevStack) => {
            const newStack = prevStack
              .map((modal) =>
                modal.id === modalId ? { ...modal, rejected: true } : modal
              )
              .filter((modal) => modal.id !== modalId);
            return newStack;
          });
          if (!modalResolved) {
            logger.debug('wrapReject called');
            modalResolved = true;
            reject(error);
          } else {
            logger.debug('wrapReject already called, skipping');
          }
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
            resolved: false,
            rejected: false,
          } as BottomSheetStackItem,
        ]);

        setTimeout(() => {
          newBottomSheetRef.current?.present();
          if (bottomSheetProps?.snapPoints) {
            newBottomSheetRef.current?.snapToIndex(bottomSheetProps.index || 0);
          }
        }, 0);
      });
    },
    [setModalStack]
  );

  const dismiss = useCallback(
    (modalIndex?: number) => {
      return new Promise<boolean>((resolvePromise) => {
        if (modalIndex && modalIndex > modalStack.length) {
          logger.error('dismiss: modalIndex out of bounds');
          resolvePromise(false);
          return;
        }

        if (modalStack.length === 0) {
          logger.error('dismiss: modalStack is empty');
          resolvePromise(false);
          return;
        }

        const currentModal = modalStack[modalIndex || modalStack.length - 1];
        logger.debug(
          `dismiss: index: ${modalIndex}, modalId: ${currentModal?.id}`,
          currentModal
        );

        // Dismiss the current modal
        currentModal?.bottomSheetRef.current?.dismiss();

        // Resolve the promise after a short delay to allow for animation
        setTimeout(() => {
          currentModal?.resolve(undefined);
          resolvePromise(true);
        }, 300); // Adjust this delay if needed
      });
    },
    [modalStack]
  );

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
      logger.debug(
        `handleSheetChanges: modalIndex: ${modalIndex}, index: ${index}, position: ${position}, type: ${type}`
      );
      const currentModal = modalStack[modalIndex];
      if (!currentModal) return;

      if (index === -1) {
        // Modal is closed (-1)
        setModalStack((prevStack) => {
          let newStack = [...prevStack];
          const modalToResolve = newStack[modalIndex];
          if (!modalToResolve) return prevStack;

          if (
            modalToResolve.props.bottomSheetProps?.stackBehavior === 'replace'
          ) {
            newStack = newStack.slice(0, modalIndex);
          } else {
            newStack.splice(modalIndex, 1);
          }

          // Only resolve if it hasn't been resolved or rejected already
          if (!modalToResolve.resolved && !modalToResolve.rejected) {
            logger.debug(
              'handleSheetChanges resolving modal:',
              modalToResolve.id
            );
            setTimeout(() => {
              modalToResolve.resolve(modalToResolve.latestData);
            }, 100);
            modalToResolve.resolved = true;
          } else {
            logger.debug(
              'handleSheetChanges: modal already resolved or rejected:',
              modalToResolve.id
            );
          }

          return newStack;
        });
      } else {
        currentModal.props.bottomSheetProps?.onChange?.(index, position, type);
      }
    },
    [modalStack]
  );

  const renderContent = useCallback(
    ({ modalIndex }: { modalIndex: number }) => {
      const currentModal = modalStack[modalIndex];
      if (!currentModal) return null;

      const footerHeight = footerHeights[currentModal.id] || 0;

      const containerType = currentModal.props.containerType || 'view';
      const Container =
        containerType === 'view'
          ? BottomSheetView
          : containerType === 'scrollview'
            ? BottomSheetScrollView
            : React.Fragment;

      const content = currentModal.render({
        data: currentModal.latestData,
        footerHeight,
        resolve: currentModal.resolve,
        onChange: (newValue) => {
          updateLatestData(currentModal.id, newValue);
        },
        reject: currentModal.reject,
      });

      return (
        <Container>
          <View style={{ paddingBottom: footerHeight }}>{content}</View>
        </Container>
      );
    },
    [modalStack, footerHeights, updateLatestData]
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
        {modalStack.map((modal, index) => {
          const bottomSheetProps = {
            ...defaultBottomSheetModalProps,
            ...modal.props.bottomSheetProps,
          };

          // Use defaultSnapPoints only when enableDynamicSizing is false and no snapPoints provided
          if (
            !bottomSheetProps.enableDynamicSizing &&
            (!bottomSheetProps.snapPoints ||
              (Array.isArray(bottomSheetProps.snapPoints) &&
                bottomSheetProps.snapPoints.length === 0))
          ) {
            bottomSheetProps.snapPoints = defaultSnapPoints;
          }

          return (
            <BottomSheetModal
              key={modal.id}
              ref={modal.bottomSheetRef}
              {...bottomSheetProps}
              onChange={(sheetIndex, position, type) =>
                handleSheetChanges({
                  modalIndex: index,
                  index: sheetIndex,
                  position,
                  type,
                })
              }
              enableDismissOnClose={true}
              containerComponent={({ children }) => {
                // On Ios we can also directly use a FullWindowOverlay
                // <FullWindowOverlay>{children}</FullWindowOverlay>
                return (
                  <Portal hostName="modal">
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                      }}
                    >
                      {children}
                    </View>
                  </Portal>
                );
              }}
              stackBehavior={
                modal.props.bottomSheetProps?.stackBehavior || 'push'
              }
              footerComponent={(props) =>
                renderFooter({ modalIndex: index, footerProps: props })
              }
              handleComponent={renderHandler({ modalIndex: index })}
              backdropComponent={renderBackdrop}
            >
              {renderContent({ modalIndex: index })}
            </BottomSheetModal>
          );
        })}
      </BottomSheetModalProvider>
    </BottomSheetContext.Provider>
  );
};
