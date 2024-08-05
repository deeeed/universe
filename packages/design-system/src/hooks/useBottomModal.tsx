import { useContext } from 'react';
import { CustomBottomSheetModalContext } from '../providers/custom-bottomsheet-provider';

export const useBottomModal = () => {
  const context = useContext(CustomBottomSheetModalContext);
  if (!context) {
    throw new Error(
      'useCustomBottomSheetModal must be used within a CustomBottomSheetModalProvider'
    );
  }
  return context;
};
