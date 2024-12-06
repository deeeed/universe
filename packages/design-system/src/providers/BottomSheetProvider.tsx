// packages/design-system/src/providers/BottomSheetProvider.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import React, {
  createContext,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  memo,
} from 'react';
import { BottomSheetModalWrapper } from '../components/bottom-modal/BottomSheetModalWrapper';
import { Portal } from '@gorhom/portal';

import type {
  BottomSheetStackItem,
  OpenDrawerProps,
} from '../types/bottomSheet.types';
import { useBottomSheetStack } from '../hooks/useBottomSheetStack';
import { useDebugRerenders } from '../hooks/useDebugRerenders';
import { baseLogger } from '../utils/logger';

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

export const BottomSheetProvider = memo(
  forwardRef<BottomSheetContextValue, BottomSheetProviderProps>(
    ({ children, defaultPortalName = 'modal', sharedIdCounter }, ref) => {
      useDebugRerenders('BottomSheetProvider');

      const {
        modalStack,
        modalStackRef,
        openDrawer,
        dismiss,
        dismissAll,
        updateModalState,
      } = useBottomSheetStack({ defaultPortalName, sharedIdCounter });

      const handleSheetChanges = useCallback(
        ({ modalId, index }: { modalId: number; index: number }) => {
          logger.debug(`handleSheetChanges: ${modalId} ${index}`);
          if (index === -1) {
            const currentModal = modalStackRef.current.find(
              (m) => m.id === modalId
            );
            if (
              currentModal &&
              !currentModal.resolved &&
              !currentModal.rejected
            ) {
              currentModal.resolve(currentModal.state.data);
            }
          }
        },
        []
      );

      const handleDismiss = useCallback(({ modalId }: { modalId: number }) => {
        const currentModal = modalStackRef.current.find(
          (m) => m.id === modalId
        );
        logger.debug(
          `handleDismiss modalId: ${modalId} stackLength: ${modalStackRef.current.length}`
        );
        if (!currentModal) return;
        if (!currentModal.resolved && !currentModal.rejected) {
          currentModal.resolve(currentModal.state.data);
        }
      }, []);

      const contextValue = useMemo<BottomSheetContextValue>(
        () => ({
          openDrawer,
          dismiss,
          dismissAll,
          modalStack,
        }),
        [openDrawer, dismiss, dismissAll, modalStack]
      );

      const renderedModals = useMemo(
        () =>
          modalStack.map((modal) => (
            <BottomSheetModalWrapper
              key={modal.id}
              modal={modal}
              onSheetChanges={handleSheetChanges}
              onDismiss={handleDismiss}
              updateModalState={updateModalState}
            />
          )),
        [modalStack, handleSheetChanges, handleDismiss, updateModalState]
      );

      useImperativeHandle(ref, () => contextValue, [contextValue]);

      return (
        <BottomSheetContext.Provider value={contextValue}>
          <BottomSheetModalProvider>
            {children}
            <Portal name={defaultPortalName}>{renderedModals}</Portal>
          </BottomSheetModalProvider>
        </BottomSheetContext.Provider>
      );
    }
  )
);

BottomSheetProvider.displayName = 'BottomSheetProvider';
