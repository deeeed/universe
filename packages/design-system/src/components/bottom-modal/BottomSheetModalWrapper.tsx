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
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import type {
  BottomSheetStackItem,
  ModalState,
} from '../../types/bottomSheet.types';
import { ConfirmCancelFooter } from './footers/ConfirmCancelFooter';
import { LabelHandler } from './handlers/LabelHandler';

interface ModalContentProps {
  modalId: number;
  state: ModalState<unknown>;
  onChange: (newValue: unknown) => void;
  render: (props: {
    state: ModalState<unknown>;
    onChange: (newValue: unknown) => void;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }) => React.ReactNode;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// Memoized modal content that prevents unnecessary re-renders
const ModalContent = memo(
  ({
    modalId,
    state,
    onChange,
    render,
    resolve,
    reject,
  }: ModalContentProps) => {
    // Store the initial render function in a ref
    const renderRef = useRef(render);

    // Update the render function ref only on mount
    useEffect(() => {
      renderRef.current = render;
    }, []); // Empty deps - only run once on mount

    // Create content using the stable render function, but only once
    const content = useMemo(() => {
      return renderRef.current({
        state,
        onChange,
        resolve,
        reject,
      });
    }, [modalId]); // Only recreate if modalId changes (different modal)

    return <>{content}</>;
  },
  // Never re-render once mounted (except for different modal)
  (prevProps, nextProps) => {
    return prevProps.modalId === nextProps.modalId;
  }
);

ModalContent.displayName = 'ModalContent';

// New default props with UI-specific configuration
const defaultBottomSheetModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  snapPoints: [],
  android_keyboardInputMode:
    Platform.OS === 'android' ? 'adjustPan' : 'adjustResize',
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
  testID?: string;
}

export const BottomSheetModalWrapper = memo(
  ({
    modal,
    onSheetChanges,
    onDismiss,
    updateModalState,
    testID,
  }: BottomSheetModalWrapperProps) => {
    const theme = useTheme();
    const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
    const lastFooterHeight = useRef(modal.state.footerHeight);
    const hasPresentedRef = useRef(false);

    // Create stable references for the modal callbacks
    const stableResolve = useRef(modal.resolve);
    const stableReject = useRef(modal.reject);

    // Update refs when modal changes, but keep same reference
    useEffect(() => {
      stableResolve.current = modal.resolve;
      stableReject.current = modal.reject;
    }, [modal.resolve, modal.reject]);

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

    // Allow user to disable safe area padding or override styles
    const disableSafeAreaPadding =
      modal.props.bottomSheetProps?.disableSafeAreaPadding;
    const userContentContainerStyle =
      modal.props.bottomSheetProps?.contentContainerStyle;
    const userFooterContainerStyle =
      modal.props.bottomSheetProps?.footerContainerStyle;

    const renderFooter = useCallback(
      (footerProps: BottomSheetFooterProps) => {
        const { renderFooter, footerType } = modal.props;
        if (!renderFooter && !footerType) return null;

        return (
          <BottomSheetFooter {...footerProps}>
            <View
              onLayout={handleFooterLayout}
              style={[
                !disableSafeAreaPadding && { paddingBottom: bottomInset },
                userFooterContainerStyle,
              ]}
            >
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
      [
        modal,
        handleChange,
        handleFooterLayout,
        bottomInset,
        disableSafeAreaPadding,
        userFooterContainerStyle,
      ]
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
            style={[
              { backgroundColor: theme.colors.surface },
              !disableSafeAreaPadding && {
                paddingBottom: modal.state.footerHeight + bottomInset,
              },
              userContentContainerStyle,
            ]}
          >
            <ModalContent
              modalId={modal.id}
              state={modal.state}
              onChange={handleChange}
              render={modal.render}
              resolve={stableResolve.current}
              reject={stableReject.current}
            />
          </View>
        </Container>
      );
    }, [
      modal.id,
      modal.state,
      modal.props.containerType,
      modal.render,
      modal.resolve,
      modal.reject,
      handleChange,
      theme.colors,
      bottomInset,
      disableSafeAreaPadding,
      userContentContainerStyle,
    ]);

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
      [modal, handleChange, theme.colors]
    );

    useEffect(() => {
      if (
        Platform.OS === 'android' &&
        modal.bottomSheetRef.current &&
        !hasPresentedRef.current
      ) {
        modal.bottomSheetRef.current.present();
        hasPresentedRef.current = true;
      }
    }, [modal.bottomSheetRef]);

    return (
      <View testID={testID}>
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
      </View>
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
