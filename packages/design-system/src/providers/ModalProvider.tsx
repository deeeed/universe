import { Portal } from '@gorhom/portal';
import React, {
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  Text,
} from 'react-native';
import { baseLogger } from '../utils/logger';
import { useTheme } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

export interface ModalStyles {
  modalContainer?: ViewStyle;
  modalContent?: ViewStyle;
  backdrop?: ViewStyle;
  closeButton?: ViewStyle;
}

export interface OpenModalProps<T = unknown> {
  initialData?: T;
  modalProps?: {
    closeOnOutsideTouch?: boolean;
    styles?: ModalStyles;
    showBackdrop?: boolean;
    showCloseButton?: boolean;
    closeButtonPosition?: 'top-right' | 'top-left';
  };
  render: (props: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    onChange: (value: T) => void;
    data: T;
  }) => ReactNode;
}

export interface ModalProviderProps {
  openModal: <T>(props: OpenModalProps<T>) => Promise<T | undefined>;
  dismiss: (modalId?: number) => Promise<boolean>;
  dismissAll: () => void;
  modalStack: ModalStackItem[];
}

export const ModalContext = createContext<ModalProviderProps | undefined>(
  undefined
);

const logger = baseLogger.extend('ModalProvider');
const MODAL_BASE_Z_INDEX = 10000;

export interface ModalStackItem<T = unknown> {
  id: number;
  content: React.ReactNode;
  props: OpenModalProps<T>;
  resolve: (value: T | undefined) => void;
  reject: (error: Error) => void;
  initialData: T;
}

export const ModalProvider = forwardRef<
  ModalProviderProps,
  {
    children: React.ReactNode;
    portalName?: string;
    sharedIdCounter: React.MutableRefObject<number>;
  }
>(({ children, portalName = 'modal', sharedIdCounter }, ref) => {
  const theme = useTheme();
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);

  const handleModalDismiss = useCallback(
    (modalId?: number) => {
      if (modalStack.length > 0) {
        const currentModal =
          modalId !== undefined
            ? modalStack.find((modal) => modal.id === modalId)
            : modalStack[modalStack.length - 1];
        if (!currentModal) {
          logger.debug('No current modal to dismiss');
          return;
        }
        logger.debug('Dismissing modal', currentModal.id);
        currentModal.resolve(currentModal.initialData);
        setModalStack((prevStack) =>
          prevStack.filter((modal) => modal.id !== currentModal.id)
        );
      }
    },
    [modalStack]
  );

  const openModal = useCallback(
    async <T,>({
      initialData,
      modalProps: modalProperties,
      render,
    }: OpenModalProps<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const modalId = sharedIdCounter.current++;
        logger.debug('Opening modal', modalId, {
          initialData,
          modalProperties,
        });

        const content = render({
          resolve: (value: T | undefined) => {
            logger.debug('Modal resolved', modalId, value);
            setModalStack((prevStack) =>
              prevStack.filter((modal) => modal.id !== modalId)
            );
            resolve(value as T);
          },
          reject: (error: Error) => {
            logger.debug('Modal rejected', modalId, error);
            setModalStack((prevStack) =>
              prevStack.filter((modal) => modal.id !== modalId)
            );
            reject(error);
          },
          onChange: (value: T) => {
            logger.debug('Modal onChange', modalId, value);
            setModalStack((prevStack) =>
              prevStack.map((modal) =>
                modal.id === modalId
                  ? {
                      ...modal,
                      initialData: value,
                    }
                  : modal
              )
            );
          },
          data: initialData as T,
        });

        setModalStack((prevStack) => [
          ...prevStack,
          {
            id: modalId,
            content,
            props: { initialData, modalProps: modalProperties, render },
            resolve,
            reject,
            initialData,
          } as ModalStackItem,
        ]);
      });
    },
    []
  );

  const dismiss = useCallback(
    (modalId?: number) => {
      return new Promise<boolean>((resolvePromise) => {
        const currentModal =
          modalId !== undefined
            ? modalStack.find((modal) => modal.id === modalId)
            : modalStack[modalStack.length - 1];

        if (!currentModal) {
          logger.debug('No modals to dismiss');
          resolvePromise(false);
          return;
        }

        logger.debug('Dismissing modal', currentModal.id);
        handleModalDismiss(currentModal.id);
        resolvePromise(true);
      });
    },
    [handleModalDismiss, modalStack]
  );

  const dismissAll = useCallback(() => {
    logger.debug('Dismissing all modals', modalStack.length);
    modalStack.forEach((modal) => modal.resolve(modal.initialData));
    setModalStack([]);
  }, [modalStack]);

  const handleOutsideTouch = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      if (!currentModal) {
        logger.debug('No current modal to dismiss');
        return;
      }

      logger.debug(
        'Outside touch detected',
        currentModal.id,
        currentModal.props
      );
      if (currentModal?.props.modalProps?.closeOnOutsideTouch !== false) {
        logger.debug('Closing modal on outside touch', currentModal.id);
        handleModalDismiss();
      } else {
        logger.debug('Ignoring outside touch', currentModal.id);
      }
    }
  }, [modalStack, handleModalDismiss]);

  const contextValue = useMemo(
    () => ({
      openModal,
      dismiss,
      dismissAll,
      modalStack,
    }),
    [openModal, dismiss, dismissAll, modalStack]
  );

  useImperativeHandle(ref, () => ({
    openModal,
    dismiss,
    dismissAll,
    modalStack,
  }));

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {modalStack.map((modal) => (
        <Portal
          key={modal.id}
          hostName={portalName}
          name={`${portalName}-modal-${modal.id}`}
        >
          {(() => {
            const showBackdrop = modal.props.modalProps?.showBackdrop ?? true;
            const showCloseButton = modal.props.modalProps?.showCloseButton;
            const closeButtonPosition =
              modal.props.modalProps?.closeButtonPosition ?? 'top-right';
            const customStyles = modal.props.modalProps?.styles ?? {};

            return (
              <TouchableWithoutFeedback onPress={handleOutsideTouch}>
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    styles.modalContainer,
                    showBackdrop && [
                      {
                        backgroundColor: theme.dark
                          ? 'rgba(55, 55, 70, 0.8)'
                          : 'rgba(0, 0, 0, 0.5)',
                      },
                      customStyles.backdrop,
                    ],
                    {
                      zIndex: MODAL_BASE_Z_INDEX + modal.id,
                      elevation: MODAL_BASE_Z_INDEX + modal.id,
                    },
                    customStyles.modalContainer,
                  ]}
                >
                  <View
                    style={[
                      styles.modalContent,
                      { backgroundColor: theme.colors.surface },
                      customStyles.modalContent,
                    ]}
                  >
                    {showCloseButton && (
                      <TouchableWithoutFeedback
                        onPress={() => handleModalDismiss(modal.id)}
                      >
                        <View
                          style={[
                            styles.closeButton,
                            styles[closeButtonPosition],
                            customStyles.closeButton,
                          ]}
                        >
                          <Text style={styles.closeButtonText}>✕</Text>
                        </View>
                      </TouchableWithoutFeedback>
                    )}
                    <ToastProvider>{modal.content}</ToastProvider>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            );
          })()}
        </Portal>
      ))}
    </ModalContext.Provider>
  );
});
ModalProvider.displayName = 'ModalProvider';

const styles = StyleSheet.create({
  'modalContainer': {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  'modalContent': {
    padding: 20,
    borderRadius: 8,
    margin: 20,
    width: '95%',
    height: 'auto',
    maxWidth: '90%',
    maxHeight: '90%',
    alignSelf: 'center',
  },
  'closeButton': {
    position: 'absolute',
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    cursor: 'pointer',
  },
  'top-right': {
    top: 8,
    right: 8,
  },
  'top-left': {
    top: 8,
    left: 8,
  },
  'closeButtonText': {
    fontSize: 16,
    color: '#666',
  },
});
