// packages/design-system/src/components/bottom-modal/BottomSheetModalWrapper.tsx
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetHandle,
  BottomSheetHandleProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetView,
  SNAP_POINT_TYPE,
} from '@gorhom/bottom-sheet';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import type {
  BottomSheetStackItem,
  ModalState,
} from '../../types/bottomSheet.types';
import { ConfirmCancelFooter } from './footers/ConfirmCancelFooter';
import { LabelHandler } from './handlers/LabelHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModalContentProps {
  modalId: number;
  state: ModalState<unknown>;
  onChange: (newValue: unknown) => void;
  renderContent: (props: {
    state: ModalState<unknown>;
    onChange: (newValue: unknown) => void;
  }) => React.ReactNode;
}

const ModalContent = memo(
  ({ state, onChange, renderContent }: ModalContentProps) => {
    return <>{renderContent({ state, onChange })}</>;
  }
);

ModalContent.displayName = 'ModalContent';

// New default props with UI-specific configuration
const defaultBottomSheetModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  snapPoints: [],
  android_keyboardInputMode: 'adjustResize',
  keyboardBehavior: 'interactive',
  keyboardBlurBehavior: 'restore',
  enablePanDownToClose: true,
  enableDismissOnClose: true,
  stackBehavior: 'push',
  backgroundStyle: { backgroundColor: 'transparent' },
  topInset: 50,
};

// Co-locate backdrop component
const BackdropComponent = memo((props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    pressBehavior="close"
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.6}
  />
));
BackdropComponent.displayName = 'BackdropComponent';

interface BottomSheetModalWrapperProps {
  modal: BottomSheetStackItem<unknown>;
  onSheetChanges: (props: {
    modalId: number;
    index: number;
    position: number;
    type: SNAP_POINT_TYPE;
  }) => void;
  onDismiss: (props: { modalId: number }) => void;
  updateModalState: (props: {
    modalId: number;
    updates: Partial<ModalState<unknown>>;
  }) => void;
}

export const BottomSheetModalWrapper = memo(
  ({
    modal,
    onSheetChanges,
    onDismiss,
    updateModalState,
  }: BottomSheetModalWrapperProps) => {
    const theme = useTheme();
    const { top: topInset } = useSafeAreaInsets();
    const lastFooterHeight = useRef(modal.state.footerHeight);

    const handleChange = useCallback(
      (newValue: unknown) => {
        updateModalState({
          modalId: modal.id,
          updates: { data: newValue },
        });
      },
      [modal.id, updateModalState]
    );

    const handleFooterLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const newHeight = event.nativeEvent.layout.height;
        if (Math.abs(lastFooterHeight.current - newHeight) > 0.1) {
          lastFooterHeight.current = newHeight;
          updateModalState({
            modalId: modal.id,
            updates: { footerHeight: newHeight },
          });
        }
      },
      [modal.id, updateModalState]
    );

    const renderFooter = useCallback(
      (footerProps: BottomSheetFooterProps) => {
        const { renderFooter, footerType } = modal.props;
        if (!renderFooter && !footerType) return null;

        return (
          <BottomSheetFooter {...footerProps}>
            <View onLayout={handleFooterLayout}>
              {!renderFooter && footerType === 'confirm_cancel' && (
                <ConfirmCancelFooter
                  onFinish={() => modal.resolve(modal.state.data)}
                  onCancel={() => modal.resolve(modal.props.initialData)}
                />
              )}
              {renderFooter &&
                renderFooter({
                  state: modal.state,
                  resolve: modal.resolve,
                  onChange: handleChange,
                  reject: modal.reject,
                  animatedFooterPosition: footerProps.animatedFooterPosition,
                })}
            </View>
          </BottomSheetFooter>
        );
      },
      [modal, handleChange, handleFooterLayout]
    );

    const renderContent = useCallback(() => {
      const containerType = modal.props.containerType || 'view';
      const Container =
        containerType === 'view'
          ? BottomSheetView
          : containerType === 'scrollview'
            ? BottomSheetScrollView
            : React.Fragment;

      return (
        <Container>
          <View
            style={{
              paddingBottom: modal.state.footerHeight,
              backgroundColor: theme.colors.surface,
            }}
          >
            <ModalContent
              modalId={modal.id}
              state={modal.state}
              onChange={handleChange}
              renderContent={() =>
                modal.render({
                  state: modal.state,
                  resolve: modal.resolve,
                  onChange: handleChange,
                  reject: modal.reject,
                })
              }
            />
          </View>
        </Container>
      );
    }, [modal, handleChange, theme.colors]);

    const bottomSheetProps = useMemo(
      () => ({
        topInset,
        ...defaultBottomSheetModalProps,
        ...modal.props.bottomSheetProps,
      }),
      [modal.props.bottomSheetProps, topInset]
    );

    const handlerComponent = useCallback(
      (handlerProps: BottomSheetHandleProps) => {
        if (modal.props.renderHandler) {
          return modal.props.renderHandler({
            ...handlerProps,
            state: modal.state,
            resolve: modal.resolve,
            reject: modal.reject,
            onChange: handleChange,
          });
        }

        if (modal.props.title) {
          return <LabelHandler {...handlerProps} label={modal.props.title} />;
        }

        return (
          <BottomSheetHandle
            {...handlerProps}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outline,
              borderTopLeftRadius: 15,
              borderTopRightRadius: 15,
              gap: 5,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          />
        );
      },
      [modal, handleChange]
    );

    return (
      <BottomSheetModal
        ref={modal.bottomSheetRef}
        {...bottomSheetProps}
        handleComponent={handlerComponent}
        footerComponent={renderFooter}
        backdropComponent={BackdropComponent}
        stackBehavior={
          bottomSheetProps?.stackBehavior ||
          defaultBottomSheetModalProps.stackBehavior
        }
        onChange={(index, position, type) =>
          onSheetChanges({
            modalId: modal.id,
            index,
            position,
            type,
          })
        }
        onDismiss={() => onDismiss({ modalId: modal.id })}
      >
        {renderContent()}
      </BottomSheetModal>
    );
  },
  (prev, next) => {
    return (
      prev.modal.id === next.modal.id &&
      prev.modal.state === next.modal.state &&
      prev.modal.props === next.modal.props
    );
  }
);

BottomSheetModalWrapper.displayName = 'BottomSheetModalWrapper';
