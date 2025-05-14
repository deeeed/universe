// packages/design-system/src/hooks/useBottomSheetStack.ts
import { useCallback, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type {
  BottomSheetStackItem,
  OpenDrawerProps,
  ModalState,
} from '../types/bottomSheet.types';
import { baseLogger } from '../utils/logger';
import { Platform } from 'react-native';

const logger = baseLogger.extend('useBottomSheetStack');

interface UseBottomSheetStackProps {
  defaultPortalName: string;
  sharedIdCounter: React.MutableRefObject<number>;
}

export function useBottomSheetStack({
  defaultPortalName,
  sharedIdCounter,
}: UseBottomSheetStackProps) {
  const [modalStack, setModalStack] = useState<
    Array<BottomSheetStackItem<unknown>>
  >([]);
  const modalStackRef = useRef<Array<BottomSheetStackItem<unknown>>>([]);
  const modalStatesRef = useRef<Map<number, ModalState<unknown>>>(new Map());

  const updateModalState = useCallback(
    (props: { modalId: number; updates: Partial<ModalState<unknown>> }) => {
      const { modalId, updates } = props;
      const currentState = modalStatesRef.current.get(modalId);
      if (!currentState) return;

      const newState = {
        ...currentState,
        ...updates,
      };

      modalStatesRef.current.set(modalId, newState);

      setModalStack((prevStack) =>
        prevStack.map((modal) =>
          modal.id === modalId ? { ...modal, state: newState } : modal
        )
      );
    },
    []
  );

  const wrapResolve = useCallback(
    <T>(
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

      if (currentModal.resolved || currentModal.rejected) {
        logger.debug('Modal already resolved or rejected');
        return;
      }

      currentModal.resolved = true;
      resolve(value);

      const updatedStack = modalStackRef.current.filter(
        (m) => m.id !== modalId
      );
      modalStackRef.current = updatedStack;
      setModalStack(updatedStack);

      setTimeout(() => {
        modalStatesRef.current.delete(modalId);
      }, 300);
    },
    []
  );

  const wrapReject = useCallback(
    (modalId: number, error: Error, reject: (error: Error) => void) => {
      logger.debug('wrapReject', error);
      const currentModal = modalStackRef.current.find((m) => m.id === modalId);

      if (!currentModal) {
        logger.error(
          `wrapReject: modal ${modalId} not found`,
          modalStackRef.current
        );
        return;
      }

      if (currentModal.resolved || currentModal.rejected) {
        logger.debug('Modal already resolved or rejected');
        return;
      }

      if (currentModal?.bottomSheetRef?.current) {
        currentModal.bottomSheetRef.current.dismiss();
      }

      currentModal.rejected = true;
      reject(error);

      modalStatesRef.current.delete(modalId);
      modalStackRef.current = modalStackRef.current.filter(
        (m) => m.id !== modalId
      );
      setModalStack(modalStackRef.current);
    },
    []
  );

  const openDrawer = useCallback(
    async <T>(props: OpenDrawerProps<T>): Promise<T | undefined> => {
      const bottomSheetRef = {
        current: null,
      } as unknown as React.RefObject<BottomSheetModal>;

      return new Promise((resolve, reject) => {
        const { initialData, portalName = defaultPortalName } = props;
        const modalId = sharedIdCounter.current++;

        logger.debug('Opening drawer:', {
          modalId,
          currentStackSize: modalStackRef.current.length,
          portalName,
          hasInitialData: !!initialData,
        });

        const previousModal =
          modalStackRef.current[modalStackRef.current.length - 1];
        const initialState: ModalState<T> = {
          data: initialData as T,
          footerHeight: previousModal?.state.footerHeight || 0,
        };

        modalStatesRef.current.set(modalId, initialState);

        const newModal: BottomSheetStackItem<T> = {
          id: modalId,
          render: props.render,
          props: {
            ...props,
            portalName,
            bottomSheetProps: {
              ...props.bottomSheetProps,
              stackBehavior: 'push',
              enablePanDownToClose: modalStackRef.current.length === 0,
            },
          },
          resolve: (value: T | undefined) =>
            wrapResolve(modalId, value, resolve),
          reject: (error: Error) => wrapReject(modalId, error, reject),
          bottomSheetRef,
          state: initialState,
          resolved: false,
          rejected: false,
        };

        modalStackRef.current = [...modalStackRef.current, newModal] as Array<
          BottomSheetStackItem<unknown>
        >;
        setModalStack(modalStackRef.current);

        const presentationDelay = Platform.OS === 'web' ? 100 : 0;

        setTimeout(() => {
          logger.debug('Presenting modal:', {
            modalId,
            hasRef: !!bottomSheetRef.current,
            snapPoints: props.bottomSheetProps?.snapPoints,
          });

          if (bottomSheetRef.current) {
            bottomSheetRef.current.present();
            if (props.bottomSheetProps?.snapPoints) {
              bottomSheetRef.current.snapToIndex(
                props.bottomSheetProps.index || 0
              );
            }
          }
        }, presentationDelay);
      });
    },
    [defaultPortalName, wrapResolve, wrapReject]
  );

  const dismiss = useCallback((modalId?: number) => {
    return new Promise<boolean>((resolvePromise) => {
      const currentModal = modalId
        ? modalStackRef.current.find((m) => m.id === modalId)
        : modalStackRef.current[modalStackRef.current.length - 1];

      if (!currentModal) {
        logger.error('dismiss: modal not found');
        resolvePromise(false);
        return;
      }

      if (currentModal.resolved || currentModal.rejected) {
        logger.debug('Modal already resolved or rejected');
        resolvePromise(false);
        return;
      }

      logger.debug(`dismiss: modalId: ${currentModal.id}`);
      currentModal.bottomSheetRef.current?.dismiss();

      currentModal.resolved = true;

      setTimeout(() => {
        currentModal.resolve(undefined);
        resolvePromise(true);
      }, 300);
    });
  }, []);

  const dismissAll = useCallback(() => {
    modalStackRef.current.forEach((modal) => {
      modal.bottomSheetRef.current?.dismiss();
      modal.resolve(undefined);
    });
    modalStatesRef.current.clear();
    modalStackRef.current = [];
    setModalStack([]);
  }, []);

  return {
    modalStack,
    modalStackRef,
    openDrawer,
    dismiss,
    dismissAll,
    updateModalState,
  };
}
