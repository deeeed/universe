import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export const useScreenWidth = () => {
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateScreenWidth = () => {
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce the width update to prevent too frequent changes
      timeoutId = setTimeout(() => {
        const newWidth = Dimensions.get('window').width;

        // Only update if the change is significant (more than 10px)
        // This prevents micro-adjustments from triggering theme changes
        if (Math.abs(newWidth - screenWidth) > 10) {
          setScreenWidth(newWidth);
        }
      }, 100); // 100ms debounce
    };

    const subscription = Dimensions.addEventListener(
      'change',
      updateScreenWidth
    );

    return () => {
      // Clean up timeout and subscription
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.remove();
    };
  }, [screenWidth]);

  return screenWidth;
};
