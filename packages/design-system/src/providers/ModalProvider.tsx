import React, {
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Modal, ModalProps, Portal } from 'react-native-paper';
import { AppTheme } from '../hooks/_useAppThemeSetup';
import { baseLogger } from '../utils/logger';
import { ThemeProvider, useTheme, useThemePreferences } from './ThemeProvider';

export interface OpenModalProps<T = unknown> {
  initialData?: T;
  modalProps?: Partial<ModalProps>;
  render: (props: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    onChange: (value: T) => void;
  }) => ReactNode;
}

export interface ModalProviderProps {
  openModal: <T = unknown>(props: OpenModalProps<T>) => Promise<T>;
}

export const ModalContext = createContext<ModalProviderProps | undefined>(
  undefined
);

const logger = baseLogger.extend('ModalProvider');

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 8,
      margin: 20,
    },
  });
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  const themePreferences = useThemePreferences();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>();
  const [modalProps, setModalProps] = useState<Partial<ModalProps>>({});
  const onModalResolveRef = useRef<((value: unknown) => void) | undefined>();
  const onModalRejectRef = useRef<((error: Error) => void) | undefined>();
  const latestModalDataRef = useRef<unknown>();

  const handleModalDismiss = useCallback(() => {
    setModalVisible(false);
    onModalRejectRef.current?.(new Error('Modal dismissed'));
  }, []);

  const openModal = useCallback(
    async <T,>({
      initialData,
      modalProps: modalProperties,
      render,
    }: OpenModalProps<T>): Promise<T> => {
      latestModalDataRef.current = initialData;

      return new Promise<T>((resolve, reject) => {
        const wrapResolve = (value: T) => {
          logger.debug('modal wrapResolve', value);
          resolve(value);
          setModalVisible(false);
        };
        const wrapReject = (error: Error) => {
          logger.debug('modal wrapReject', error);
          reject(error);
          setModalVisible(false);
        };
        const wrapOnChange = (value: T) => {
          logger.debug('modal onChange', value);
          latestModalDataRef.current = value;
        };

        onModalResolveRef.current = wrapResolve as (value: unknown) => void;
        onModalRejectRef.current = wrapReject;

        setModalContent(
          render({
            resolve: wrapResolve,
            reject: wrapReject,
            onChange: wrapOnChange,
          })
        );
        setModalProps(modalProperties || {});
        setModalVisible(true);
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      openModal,
    }),
    [openModal]
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {Platform.OS === 'web' || Platform.OS === 'ios' ? (
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={handleModalDismiss}
            contentContainerStyle={styles.modalContent}
            {...modalProps}
          >
            <ThemeProvider preferences={themePreferences}>
              {modalContent}
            </ThemeProvider>
          </Modal>
        </Portal>
      ) : (
        <Portal>
          <ThemeProvider preferences={themePreferences}>
            <Modal
              visible={modalVisible}
              onDismiss={handleModalDismiss}
              contentContainerStyle={styles.modalContent}
              {...modalProps}
            >
              {modalContent}
            </Modal>
          </ThemeProvider>
        </Portal>
      )}
    </ModalContext.Provider>
  );
};
