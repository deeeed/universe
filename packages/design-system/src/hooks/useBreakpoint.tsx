import { useScreenWidth } from './useScreenWidth';
import { useTheme } from '../providers/ThemeProvider';
import { Breakpoint } from '../constants/breakpoints';

interface UseBreakpointReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentBreakpoint: Breakpoint;
}

export function useBreakpoint(): UseBreakpointReturn {
  const theme = useTheme();
  const screenWidth = useScreenWidth();

  const isMobile = screenWidth < theme.breakpoints.mobile;
  const isTablet =
    screenWidth >= theme.breakpoints.mobile &&
    screenWidth < theme.breakpoints.tablet;
  const isDesktop = screenWidth >= theme.breakpoints.tablet;

  const currentBreakpoint: Breakpoint = isMobile
    ? 'mobile'
    : isTablet
      ? 'tablet'
      : 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
  };
}
