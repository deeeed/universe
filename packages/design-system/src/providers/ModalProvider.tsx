import { Portal } from '@gorhom/portal';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { baseLogger } from '../utils/logger';
import { useTheme } from './ThemeProvider';

export interface ModalStyles {
  modalContainer?: ViewStyle;
  modalContent?: ViewStyle;
}

export interface OpenModalProps<T = unknown> {
  initialData?: T;
  modalProps?: {
    closeOnOutsideTouch?: boolean;
    styles?: ModalStyles;
    showBackdrop?: boolean;
  };
  render: (props: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    onChange: (value: T) => void;
    data: T;
  }) => ReactNode;
}

export interface ModalProviderProps {
  openModal: <T = unknown>(props: OpenModalProps<T>) => Promise<T>;
  dismiss: () => Promise<boolean>;
  dismissAll: () => void;
}

export const ModalContext = createContext<ModalProviderProps | undefined>(
  undefined
);

const logger = baseLogger.extend('ModalProvider');

export interface ModalStackItem<T = unknown> {
  id: number;
  content: ReactNode;
  props: OpenModalProps<T>;
  resolve: (value: T | undefined) => void;
  reject: (error: Error) => void;
  initialData: T;
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const modalIdCounter = useRef(0);

  const handleModalDismiss = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      if (!currentModal) {
        logger.debug('No current modal to dismiss');
        return;
      }
      logger.debug('Dismissing modal', currentModal.id);
      currentModal?.resolve(currentModal.initialData);
      setModalStack((prevStack) => prevStack.slice(0, -1));
    }
  }, [modalStack]);

  const openModal = useCallback(
    async <T,>({
      initialData,
      modalProps: modalProperties,
      render,
    }: OpenModalProps<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const modalId = modalIdCounter.current++;
        logger.debug('Opening modal', modalId, {
          initialData,
          modalProperties,
        });

        const wrapResolve = (value: T | undefined) => {
          logger.debug('Modal resolved', modalId, value);
          setModalStack((prevStack) =>
            prevStack.filter((modal) => modal.id !== modalId)
          );
          resolve(value as T);
        };

        const wrapReject = (error: Error) => {
          logger.debug('Modal rejected', modalId, error);
          setModalStack((prevStack) =>
            prevStack.filter((modal) => modal.id !== modalId)
          );
          reject(error);
        };

        const wrapOnChange = (value: T) => {
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
        };

        const content = render({
          resolve: wrapResolve,
          reject: wrapReject,
          onChange: wrapOnChange,
          data: initialData as T,
        });

        setModalStack((prevStack) => [
          ...prevStack,
          {
            id: modalId,
            content,
            props: { initialData, modalProps: modalProperties, render },
            resolve: wrapResolve,
            reject: wrapReject,
            initialData: initialData,
          } as ModalStackItem<unknown>,
        ]);
      });
    },
    []
  );

  const dismiss = useCallback(() => {
    return new Promise<boolean>((resolvePromise) => {
      if (modalStack.length === 0) {
        logger.debug('No modals to dismiss');
        resolvePromise(false);
        return;
      }

      logger.debug('Dismissing top modal');
      handleModalDismiss();
      resolvePromise(true);
    });
  }, [handleModalDismiss, modalStack.length]);

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
    }),
    [openModal, dismiss, dismissAll]
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <Portal hostName="modal">
        {modalStack.map((modal, index) => {
          const showBackdrop = modal.props.modalProps?.showBackdrop ?? true;
          const customStyles = modal.props.modalProps?.styles ?? {};

          console.log(
            `displaying modal ${modal.id} showBackdrop: ${showBackdrop}`,
            modal.props.modalProps
          );
          return (
            <TouchableWithoutFeedback
              key={modal.id}
              onPress={handleOutsideTouch}
            >
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.modalContainer,
                  showBackdrop && styles.backdrop,
                  { zIndex: 9999 + index },
                  customStyles.modalContainer,
                ]}
              >
                <TouchableWithoutFeedback>
                  <View
                    style={[
                      styles.modalContent,
                      { backgroundColor: theme.colors.surface },
                      customStyles.modalContent,
                    ]}
                  >
                    {modal.content}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </Portal>
    </ModalContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 8,
    margin: 20,
    maxWidth: '90%',
    maxHeight: '90%',
  },
});
