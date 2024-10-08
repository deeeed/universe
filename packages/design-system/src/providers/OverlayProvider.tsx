import React, { createContext, useContext, useState, useCallback } from 'react';

interface OverlayContextType {
  getNextZIndex: () => number;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};

interface OverlayProviderProps {
  children: React.ReactNode;
  initialZIndex?: number;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({
  children,
  initialZIndex = 1000,
}) => {
  const [currentZIndex, setCurrentZIndex] = useState(initialZIndex);

  const getNextZIndex = useCallback(() => {
    setCurrentZIndex((prevZIndex) => prevZIndex + 1);
    return currentZIndex;
  }, []);

  return (
    <OverlayContext.Provider value={{ getNextZIndex }}>
      {children}
    </OverlayContext.Provider>
  );
};
