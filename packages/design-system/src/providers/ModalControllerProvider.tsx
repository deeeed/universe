import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  BottomSheetContextValue,
  BottomSheetProvider,
  BottomSheetStackItem,
  OpenDrawerProps,
} from './BottomSheetProvider';
import {
  ModalProvider,
  ModalProviderProps,
  ModalStackItem,
  OpenModalProps,
} from './ModalProvider';

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
}

export const ModalControllerProvider: React.FC<
  ModalControllerProviderProps
> = ({ children, portalName = 'modal' }) => {
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
          ...(modalProviderRef.current.modalStack || []),
          ...(bottomSheetProviderRef.current.modalStack || []),
        ];

        if (combinedStack.length === 0) {
          return false;
        }

        const topItem = combinedStack[combinedStack.length - 1];
        if (topItem && 'props' in topItem) {
          // It's a drawer
          return bottomSheetProviderRef.current.dismiss();
        } else {
          // It's a modal
          return modalProviderRef.current.dismiss();
        }
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
