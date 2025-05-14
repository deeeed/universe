import {
  ColorValue,
  RefreshControlProps as RefreshControlPropsRN,
} from 'react-native';
import { AppTheme } from '../../hooks/_useAppThemeSetup';

/**
 * Props for the RefreshControl component that extends React Native's RefreshControl props
 * with additional customization options for both web and native platforms.
 */
export interface RefreshControlProps extends RefreshControlPropsRN {
  /** Custom component to render while pulling to refresh */
  PullingIndicator?: React.FC<PullingIndicatorProps>;
  /** Custom component to render while refreshing */
  RefreshingIndicator?: React.FC<RefreshingIndicatorProps>;
  /** Callback fired when the pulling state changes */
  onPullStateChange?: (isPulling: boolean) => void;
  /** Delay in ms before resetting the pull state */
  pullResetDelay?: number;
  /** Test ID for the component */
  testID?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Props for the pulling indicator component
 */
export interface PullingIndicatorProps {
  /** Color of the indicator */
  color?: ColorValue;
  /** Size of the indicator in pixels */
  size?: number;
  /** Progress value between 0 and 1 */
  progress: number;
}

/**
 * Props for the refreshing indicator component
 */
export interface RefreshingIndicatorProps {
  /** Color of the indicator */
  color?: ColorValue;
  /** Size of the indicator in pixels */
  size?: number;
}

/**
 * Props for internal styles configuration
 */
export interface StylesProps {
  /** Current theme */
  theme: AppTheme;
  /** Background color for the progress indicator */
  progressBackgroundColor?: ColorValue;
}

/**
 * Constants used throughout the RefreshControl implementation
 */
export const CONSTANTS = {
  /** Maximum translation distance in pixels */
  maxTranslateY: 50,
  /** Threshold to trigger refresh (30% of maxTranslateY) */
  refreshThreshold: 50 * 0.3,
  /** Minimum visible position for the refresh indicator */
  minVisiblePosition: 20,
  /** Default size for the indicator */
  defaultIndicatorSize: 24,
  /** Default delay before resetting pull state */
  DEFAULT_PULL_RESET_DELAY: 300,
  /** Minimum duration to show the refreshing indicator */
  MIN_REFRESHING_DURATION: 1500,
} as const;
