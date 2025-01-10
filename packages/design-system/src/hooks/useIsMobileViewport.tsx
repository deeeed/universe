import { useScreenWidth } from './useScreenWidth';
import { useTheme } from '../providers/ThemeProvider';

interface UseIsMobileViewportOptions {
  breakpoint?: number;
}

export function useIsMobileViewport(
  options?: UseIsMobileViewportOptions
): boolean {
  const theme = useTheme();
  const screenWidth = useScreenWidth();
  const mobileBreakpoint = options?.breakpoint ?? theme.breakpoints.mobile;

  return screenWidth < mobileBreakpoint;
}
