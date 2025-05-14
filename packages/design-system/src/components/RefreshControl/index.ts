import { Platform } from 'react-native';

const component =
  Platform.OS === 'web'
    ? require('./RefreshControl.web')
    : require('./RefreshControl.native');

export const { RefreshControl } = component;
export type { RefreshControlProps } from './RefreshControl.types';
