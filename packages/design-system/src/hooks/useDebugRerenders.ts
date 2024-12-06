import { useRef, useEffect } from 'react';

export function useDebugRerenders(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`[Debug] ${componentName} rendered:`, {
      count: renderCount.current,
      timestamp: new Date().toISOString(),
    });
  });
}
