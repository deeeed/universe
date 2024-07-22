import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export const useScreenWidth = () => {
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener(
      'change',
      updateScreenWidth
    );

    return () => {
      // Remove the event listener
      subscription.remove();
    };
  }, []);

  return screenWidth;
};
