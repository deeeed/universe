import { useContext } from 'react';
import { ToastContext } from '../providers/toast.provider';

/**
 * useToast hook is used to show and hide Toast messages.
 * ## Usage
 * Import the `useToast` hook from the library. Calling it will return you an object with two functions `show` and `hide` to show or hide toast.
 *
 * ```tsx
 * import { useToast } from 'react-native-paper-toast';
 *
 * export const Screen: React.FC<Props> = (props) => {
 *   const toaster = useToast();
 *   // You can now toast methods from handler functions, effects or onPress props!
 *
 *   // Call from handler function
 *   const handleError = () =>
 *     toaster.show({ message: 'Invalid Username', type: 'error' });
 *
 *   // Call from Effects
 *   useEffect(() => {
 *     login(username, password).then((v) =>
 *       toaster.show({ message: 'Login successful', duration: 2000 })
 *     );
 *   });
 *
 *   return (
 *    <Surface>
 *      <Button onPress={() => toaster.show({ message: 'Here is a toast for ya!' })}>
 *        Show Toast
 *      </Button>
 *      <Button onPress={toaster.hide}>Hide Toast</Button>
 *    </Surface>
 *  );
 * };
 * ```
 */
export const useToast = () => {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return toast;
};
