import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FiscalMode = 'mock' | 'prod';

interface FiscalModeContextType {
  mode: FiscalMode;
  setMode: (mode: FiscalMode) => void;
  isMockMode: boolean;
}

const FiscalModeContext = createContext<FiscalModeContextType | undefined>(undefined);

export const FiscalModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<FiscalMode>(() => {
    const stored = localStorage.getItem('fiscal_mode');
    return (stored === 'mock' || stored === 'prod') ? stored : 'prod';
  });

  const setMode = (newMode: FiscalMode) => {
    setModeState(newMode);
    localStorage.setItem('fiscal_mode', newMode);
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[FISCAL MODE] Current mode: ${mode}`);
    }
  }, [mode]);

  return (
    <FiscalModeContext.Provider value={{ mode, setMode, isMockMode: mode === 'mock' }}>
      {children}
    </FiscalModeContext.Provider>
  );
};

export const useFiscalMode = () => {
  const context = useContext(FiscalModeContext);
  if (!context) {
    throw new Error('useFiscalMode must be used within FiscalModeProvider');
  }
  return context;
};
