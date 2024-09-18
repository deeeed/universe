import React, {
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, ModalProps, StyleSheet, View } from 'react-native';
import { AppTheme } from '../hooks/_useAppThemeSetup';
import { baseLogger } from '../utils/logger';
import { ThemeProvider, useTheme, useThemePreferences } from './ThemeProvider';

export interface OpenModalProps<T = unknown> {
  initialData?: T;
  modalProps?: Partial<ModalProps> & {
    closeOnOutsideTouch?: boolean;
  };
  render: (props: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    onChange: (value: T) => void;
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

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 8,
      margin: 20,
      width: '90%', // Adjust as needed
      maxHeight: '90%', // Adjust as needed
    },
  });
};

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
  const themePreferences = useThemePreferences();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);

  const handleModalDismiss = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      currentModal?.resolve(currentModal.initialData);
      setModalStack((prevStack) => prevStack.slice(0, -1));
    }
  }, [modalStack]);

  const modalIdCounter = useRef(0);

  const openModal = useCallback(
    async <T,>({
      initialData,
      modalProps: modalProperties,
      render,
    }: OpenModalProps<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const modalId = modalIdCounter.current++;

        const wrapResolve = (value: T | undefined) => {
          logger.debug('modal wrapResolve', value);
          setModalStack((prevStack) =>
            prevStack.filter((modal) => modal.id !== modalId)
          );
          resolve(value as T);
        };

        const wrapReject = (error: Error) => {
          logger.debug('modal wrapReject', error);
          setModalStack((prevStack) =>
            prevStack.filter((modal) => modal.id !== modalId)
          );
          reject(error);
        };

        const wrapOnChange = (value: T) => {
          logger.debug('modal onChange', value);
          // Update the initialData of the current modal
          setModalStack((prevStack) =>
            prevStack.map((modal) =>
              modal.id === modalId ? { ...modal, initialData: value } : modal
            )
          );
        };

        const content = render({
          resolve: wrapResolve,
          reject: wrapReject,
          onChange: wrapOnChange,
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
          } as ModalStackItem<unknown>, // Type assertion here
        ]);
      });
    },
    []
  );

  const dismiss = useCallback(() => {
    return new Promise<boolean>((resolvePromise) => {
      if (modalStack.length === 0) {
        resolvePromise(false);
        return;
      }

      handleModalDismiss();
      resolvePromise(true);
    });
  }, [handleModalDismiss, modalStack.length]);

  const dismissAll = useCallback(() => {
    modalStack.forEach((modal) => modal.resolve(modal.initialData));
    setModalStack([]);
  }, [modalStack]);

  const handleOutsideTouch = useCallback(() => {
    if (modalStack.length > 0) {
      const currentModal = modalStack[modalStack.length - 1];
      if (currentModal?.props.modalProps?.closeOnOutsideTouch !== false) {
        handleModalDismiss();
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
      {modalStack.map((modal) => (
        <Modal
          key={modal.id}
          visible={true}
          onRequestClose={handleModalDismiss}
          transparent={true}
          animationType="fade"
          {...modal.props.modalProps}
        >
          <ThemeProvider preferences={themePreferences}>
            <View style={styles.modalContainer} onTouchEnd={handleOutsideTouch}>
              <View
                style={styles.modalContent}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {modal.content}
              </View>
            </View>
          </ThemeProvider>
        </Modal>
      ))}
    </ModalContext.Provider>
  );
};
