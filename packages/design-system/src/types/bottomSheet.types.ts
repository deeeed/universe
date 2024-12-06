// packages/design-system/src/types/bottomSheet.types.ts
import type {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetHandleProps,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';

export interface ModalState<T = unknown> {
  data: T;
  footerHeight: number;
}

export interface OpenDrawerProps<T = unknown> {
  title?: string;
  footerType?: 'confirm_cancel';
  initialData?: T;
  portalName?: string;
  containerType?: 'view' | 'scrollview' | 'none';
  bottomSheetProps?: Partial<BottomSheetModalProps>;
  render: (props: {
    state: ModalState<T>;
    resolve: (value: T | undefined) => void;
    onChange: (value: T) => void;
    reject: (error: Error) => void;
  }) => ReactNode;
  renderHandler?: (
    props: {
      state: ModalState<T>;
      resolve: (value: T | undefined) => void;
      onChange: (value: T) => void;
      reject: (error: Error) => void;
    } & BottomSheetHandleProps
  ) => ReactNode;
  renderFooter?: (
    props: {
      state: ModalState<T>;
      resolve: (value: T | undefined) => void;
      onChange: (value: T) => void;
      reject: (error: Error) => void;
    } & BottomSheetFooterProps
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
