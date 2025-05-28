// packages/design-system/src/types/bottomSheet.types.ts
import type {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetHandleProps,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

export interface ModalState<T = unknown> {
  data: T;
  footerHeight: number;
}

export interface CustomBottomSheetProps extends BottomSheetModalProps {
  disableSafeAreaPadding?: boolean;
  contentContainerStyle?: ViewStyle;
  footerContainerStyle?: ViewStyle;
}

export interface OpenDrawerProps<T = unknown> {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: T;
  portalName?: string;
  containerType?: 'view' | 'scrollview' | 'none';
  bottomSheetProps?: Partial<CustomBottomSheetProps>;
  render: (props: DrawerRenderProps<T>) => ReactNode;
  renderHandler?: (
    props: DrawerRenderProps<T> & BottomSheetHandleProps
  ) => ReactNode;
  renderFooter?: (
    props: DrawerRenderProps<T> & BottomSheetFooterProps
  ) => ReactNode;
}

export interface BottomSheetStackItem<T = unknown> {
  id: number;
  render: OpenDrawerProps<T>['render'];
  props: OpenDrawerProps<T>;
  resolve: (value: T | undefined) => void;
  reject: (error: Error) => void;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  state: ModalState<T>;
  resolved: boolean;
  rejected: boolean;
}

export interface DrawerRenderProps<T = unknown> {
  state: ModalState<T>;
  resolve: (value: T | undefined) => void;
  onChange: (value: T) => void;
  reject: (error: Error) => void;
}

// Type utilities for DrawerRenderProps
export type ExtractDrawerData<T> =
  T extends DrawerRenderProps<infer U> ? U : never;
export type DrawerHandlerProps<T = unknown> = DrawerRenderProps<T> &
  BottomSheetHandleProps;
export type DrawerFooterProps<T = unknown> = DrawerRenderProps<T> &
  BottomSheetFooterProps;
