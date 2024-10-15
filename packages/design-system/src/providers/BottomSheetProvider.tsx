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
import React, {
  createContext,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmCancelFooter } from '../components/bottom-modal/footers/ConfirmCancelFooter';
import { LabelHandler } from '../components/bottom-modal/handlers/LabelHandler';
import { baseLogger } from '../utils/logger';
import { Portal } from '@gorhom/portal';

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
  portalName?: string;
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
  children: React.ReactNode;
  defaultPortalName?: string;
  sharedIdCounter: React.MutableRefObject<number>;
}

export interface BottomSheetContextValue {
  openDrawer: <T>(props: OpenDrawerProps<T>) => Promise<T | undefined>;
  dismiss: (modalId?: number) => Promise<boolean>;
  dismissAll: () => void;
  modalStack: BottomSheetStackItem<unknown>[];
}

export const BottomSheetContext = createContext<
  BottomSheetContextValue | undefined
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
export const BottomSheetProvider = forwardRef<
  BottomSheetContextValue,
  BottomSheetProviderProps
>(({ children, defaultPortalName = 'modal', sharedIdCounter }, ref) => {
  const [modalStack, setModalStack] = useState<Array<BottomSheetStackItem>>([]);
  const modalStackRef = useRef<Array<BottomSheetStackItem>>([]);

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
      modalId,
      footerProps,
    }: {
      modalId: number;
      footerProps: BottomSheetFooterProps;
    }) => {
      const modal = modalStack.find((m) => m.id === modalId);
      if (!modal) return null;

      const { renderFooter, footerType } = modal.props;

      if (!renderFooter && !footerType) return null;

      return (
        <BottomSheetFooter {...footerProps}>
          <View
            onLayout={(event) => {
              if (modalId === modalStack[modalStack.length - 1]?.id) {
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
    ({ modalId }: { modalId: number }) => {
      const HandlerComponent = (props: BottomSheetHandleProps) => {
        const modal = modalStack.find((m) => m.id === modalId);
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

  const wrapResolve = useCallback(
    <T,>(
      modalId: number,
      value: T | undefined,
      resolve: (value: T | undefined) => void
    ) => {
      logger.debug('wrapResolve value', value);

      const currentModal = modalStackRef.current.find((m) => m.id === modalId);
      if (!currentModal) {
        logger.error(
          `wrapResolve: modal ${modalId} not found`,
          modalStackRef.current
        );
        return;
      }

      logger.debug(
        `wrapResolve currentModal.bottomSheetRef`,
        currentModal?.bottomSheetRef.current
      );

      // Close the bottom sheet if it's open
      if (currentModal?.bottomSheetRef?.current) {
        currentModal.bottomSheetRef.current.dismiss();
      }

      logger.debug('wrapResolve Calling resolve function');
      resolve(value);
    },
    []
  );

  const wrapReject = useCallback(
    (modalId: number, error: Error, reject: (error: Error) => void) => {
      logger.debug('wrapReject', error);

      const currentModal = modalStackRef.current.find((m) => m.id === modalId);
      if (!currentModal) {
        logger.error(
          `wrapResolve: modal ${modalId} not found`,
          modalStackRef.current
        );
        return;
      }

      logger.debug(
        `wrapResolve currentModal.bottomSheetRef`,
        currentModal?.bottomSheetRef.current
      );

      // Close the bottom sheet if it's open
      if (currentModal?.bottomSheetRef?.current) {
        currentModal.bottomSheetRef.current.dismiss();
      }
      reject(error);
    },
    [setModalStack]
  );

  const openDrawer = useCallback(
    async <T,>(props: OpenDrawerProps<T>): Promise<T | undefined> => {
      const newBottomSheetRef = React.createRef<BottomSheetModal>();

      return new Promise((resolve, reject) => {
        const {
          initialData,
          bottomSheetProps,
          portalName = defaultPortalName,
        } = props;

        const modalId = sharedIdCounter.current++;
        let modalResolved = false;

        const modalResolve = (value: T | undefined) => {
          if (!modalResolved) {
            modalResolved = true;
            wrapResolve(modalId, value, resolve);
          } else {
            logger.debug('Resolve already called, skipping');
          }
        };

        const modalReject = (error: Error) => {
          if (!modalResolved) {
            modalResolved = true;
            wrapReject(modalId, error, reject);
          } else {
            logger.debug('Reject already called, skipping');
          }
        };

        const newModal = {
          id: modalId,
          render: props.render,
          props: { ...props, portalName }, // Include portalName in the props
          resolve: modalResolve,
          reject: modalReject,
          bottomSheetRef: newBottomSheetRef,
          initialData,
          latestData: initialData,
        } as BottomSheetStackItem;

        modalStackRef.current = [...modalStackRef.current, newModal];
        setModalStack(modalStackRef.current);

        setTimeout(() => {
          newBottomSheetRef.current?.present();
          if (bottomSheetProps?.snapPoints) {
            newBottomSheetRef.current?.snapToIndex(bottomSheetProps.index || 0);
          }
        }, 0);
      });
    },
    [setModalStack, defaultPortalName, wrapResolve, wrapReject]
  );

  const dismiss = useCallback(
    (modalId?: number) => {
      return new Promise<boolean>((resolvePromise) => {
        const currentModal = modalId
          ? modalStack.find((m) => m.id === modalId)
          : modalStack[modalStack.length - 1];

        if (!currentModal) {
          logger.error('dismiss: modal not found');
          resolvePromise(false);
          return;
        }

        logger.debug(`dismiss: modalId: ${currentModal.id}`, currentModal);

        // Dismiss the current modal
        currentModal.bottomSheetRef.current?.dismiss();

        // Resolve the promise after a short delay to allow for animation
        setTimeout(() => {
          logger.debug(
            'dismiss: resolving modal after delay:',
            currentModal.id
          );
          currentModal.resolve(undefined);
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
      modalId,
      index,
      position,
      type,
    }: {
      modalId: number;
      index: number;
      position: number;
      type: SNAP_POINT_TYPE;
    }) => {
      logger.debug(
        `handleSheetChanges: modalId: ${modalId}, index: ${index}, position: ${position}, type: ${type}, modalStack.length: ${modalStack.length}`
      );
      const currentModal = modalStack.find((m) => m.id === modalId);
      if (!currentModal) {
        logger.error(
          `handleSheetChanges: modal modalId=${modalId} not found`,
          modalStack
        );
        return;
      }

      if (index === -1) {
        logger.debug(`handleSheetChanges: modalId: ${modalId} is closing`);
        if (!currentModal.resolved) {
          logger.debug(
            `handleSheetChanges: modalId: ${modalId} is closing and not resolved, resolving with initialData`,
            currentModal.initialData
          );
          currentModal.resolve(undefined);
        }
        setTimeout(() => {
          // remove from modalStack
          setModalStack((prevStack) => {
            const newStack = prevStack.filter((m) => m.id !== modalId);
            logger.debug('handleSheetChanges: newStack', newStack);
            return newStack;
          });
        }, 100);
      } else {
        logger.debug(
          `handleSheetChanges: modalId: ${modalId}, index: ${index}, position: ${position}, type: ${type}`
        );
        currentModal.props.bottomSheetProps?.onChange?.(index, position, type);
      }
    },
    [modalStack]
  );

  const renderContent = useCallback(
    ({ modalId }: { modalId: number }) => {
      const currentModal = modalStack.find((m) => m.id === modalId);
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

  const contextValue = useMemo<BottomSheetContextValue>(
    () => ({
      openDrawer,
      dismiss,
      dismissAll,
      modalStack,
    }),
    [openDrawer, dismiss, dismissAll, modalStack]
  );

  useImperativeHandle(ref, () => ({
    openDrawer,
    dismiss,
    dismissAll,
    modalStack,
  }));

  return (
    <BottomSheetContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        {children}
        {modalStack.map((modal) => {
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
                  modalId: modal.id,
                  index: sheetIndex,
                  position,
                  type,
                })
              }
              enableDismissOnClose={true}
              // FIXME: missing types in BottomSheetModal
              // @ts-expect-error missing types in BottomSheetModal
              containerComponent={({
                children,
              }: {
                children: React.ReactNode;
              }) => (
                <Portal hostName={modal.props.portalName || defaultPortalName}>
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      zIndex: 9999,
                    }}
                  >
                    {children}
                  </View>
                </Portal>
              )}
              stackBehavior={
                modal.props.bottomSheetProps?.stackBehavior || 'push'
              }
              footerComponent={(props) =>
                renderFooter({ modalId: modal.id, footerProps: props })
              }
              handleComponent={renderHandler({ modalId: modal.id })}
              backdropComponent={renderBackdrop}
            >
              {renderContent({ modalId: modal.id })}
            </BottomSheetModal>
          );
        })}
      </BottomSheetModalProvider>
    </BottomSheetContext.Provider>
  );
});
BottomSheetProvider.displayName = 'BottomSheetProvider';
