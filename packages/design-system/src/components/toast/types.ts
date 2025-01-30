export interface SwipeConfig {
  isEnabled?: boolean;
  direction?: 'left-to-right' | 'right-to-left' | 'both';
  initialThreshold?: number;
  dismissThreshold?: number;
  velocityThreshold?: number;
  animationDuration?: number;
  dismissDistance?: number;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top' | 'bottom' | 'middle';

// ... other shared types can go here
