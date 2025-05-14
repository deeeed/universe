import React from 'react';
import { RefreshControl as RefreshControlRN } from 'react-native';
import { RefreshControlProps } from './RefreshControl.types';

/**
 * Native implementation of RefreshControl component.
 * Uses React Native's built-in RefreshControl component with proper type forwarding.
 *
 * @param props - Component props extending React Native's RefreshControl props
 * @param ref - Forwarded ref for the underlying RefreshControl component
 */
export const RefreshControl = React.forwardRef<unknown, RefreshControlProps>(
  (props, ref) => {
    const { testID, ...rcProps } = props;
    return (
      <RefreshControlRN
        ref={ref as React.Ref<RefreshControlRN>}
        testID={testID}
        {...rcProps}
      />
    );
  }
);

RefreshControl.displayName = 'RefreshControl';
