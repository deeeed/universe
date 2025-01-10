export const breakpoints = {
  mobile: 380,
  tablet: 768,
  desktop: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;
