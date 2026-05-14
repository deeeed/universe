import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  BottomSheetContextValue,
  BottomSheetProvider,
} from './BottomSheetProvider';
import {
  ModalProvider,
  ModalProviderProps,
  ModalStackItem,
  OpenModalProps,
} from './ModalProvider';
import {
  BottomSheetStackItem,
  OpenDrawerProps,
} from '../types/bottomSheet.types';

interface ModalControllerContextValue {
  openModal: <T>(props: OpenModalProps<T>) => Promise<T | undefined>;
  openDrawer: <T>(props: OpenDrawerProps<T>) => Promise<T | undefined>;
  dismiss: () => Promise<boolean>;
  dismissAll: () => void;
  modalStack: (BottomSheetStackItem | ModalStackItem)[];
}

const ModalControllerContext = createContext<
  ModalControllerContextValue | undefined
>(undefined);

export const useModalController = () => {
  const context = useContext(ModalControllerContext);
  if (!context) {
    throw new Error(
      'useModalController must be used within a ModalControllerProvider'
    );
  }
  return context;
};

interface ModalControllerProviderProps {
  children: React.ReactNode;
  portalName?: string;
  renderPortalHost?: boolean;
}

export const ModalControllerProvider: React.FC<
  ModalControllerProviderProps
> = ({ children, portalName = 'modal', renderPortalHost = true }) => {
  const modalProviderRef = useRef<ModalProviderProps>(null);
  const bottomSheetProviderRef = useRef<BottomSheetContextValue>(null);
  const sharedIdCounter = useRef(0);

  const contextValue = useMemo<ModalControllerContextValue>(() => {
    const openModal = <T,>(props: OpenModalProps<T>) => {
      if (!modalProviderRef.current) {
        throw new Error('Modal provider not initialized');
      }
      return modalProviderRef.current.openModal(props);
    };

    const openDrawer = <T,>(props: OpenDrawerProps<T>) => {
      if (!bottomSheetProviderRef.current) {
        throw new Error('BottomSheet provider not initialized');
      }
      return bottomSheetProviderRef.current.openDrawer(props);
    };

    const dismiss = async () => {
      if (modalProviderRef.current && bottomSheetProviderRef.current) {
        const combinedStack = [
          ...(modalProviderRef.current.modalStack || []).map((item) => ({
            item,
            type: 'modal' as const,
          })),
          ...(bottomSheetProviderRef.current.modalStack || []).map((item) => ({
            item,
            type: 'drawer' as const,
          })),
        ].sort((a, b) => (a.item.id || 0) - (b.item.id || 0));

        if (combinedStack.length === 0) {
          return false;
        }

        const topItem = combinedStack[combinedStack.length - 1];
        if (!topItem) return false;
        return topItem.type === 'drawer'
          ? bottomSheetProviderRef.current.dismiss(topItem.item.id)
          : modalProviderRef.current.dismiss(topItem.item.id);
      }
      throw new Error('Modal and BottomSheet providers not initialized');
    };

    const dismissAll = () => {
      if (modalProviderRef.current && bottomSheetProviderRef.current) {
        modalProviderRef.current.dismissAll();
        bottomSheetProviderRef.current.dismissAll();
      } else {
        throw new Error('Modal and BottomSheet providers not initialized');
      }
    };

    const modalStack = [
      ...(modalProviderRef.current?.modalStack || []),
      ...(bottomSheetProviderRef.current?.modalStack || []),
    ].sort((a, b) => (a.id || 0) - (b.id || 0));

    return { openModal, openDrawer, dismiss, dismissAll, modalStack };
  }, []);

  return (
    <ModalControllerContext.Provider value={contextValue}>
      <BottomSheetProvider
        defaultPortalName={portalName}
        renderPortalHost={renderPortalHost}
        ref={bottomSheetProviderRef as React.Ref<BottomSheetContextValue>}
        sharedIdCounter={sharedIdCounter}
      >
        <ModalProvider
          portalName={portalName}
          ref={modalProviderRef as React.Ref<ModalProviderProps>}
          sharedIdCounter={sharedIdCounter}
        >
          {children}
        </ModalProvider>
      </BottomSheetProvider>
    </ModalControllerContext.Provider>
  );
};

// Re-export the OpenModalProps and OpenDrawerProps for convenience
export type { OpenDrawerProps, OpenModalProps };
