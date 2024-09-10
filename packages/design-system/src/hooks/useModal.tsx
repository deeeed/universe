import { useContext } from 'react';
import { CustomModalContext } from '../providers/CustomModalProvider';

export const useModal = () => {
  const context = useContext(CustomModalContext);
  if (!context) {
    throw new Error(
      'useCustomBottomSheetModal must be used within a CustomBottomSheetModalProvider'
    );
  }
  return context;
};
