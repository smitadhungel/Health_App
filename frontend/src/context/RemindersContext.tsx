import React, { createContext, useContext, useState } from 'react';

interface RemindersContextType {
  trigger: number;
  refresh: () => void;
}

const RemindersContext = createContext<RemindersContextType>({
  trigger: 0,
  refresh: () => {},
});

export const RemindersProvider = ({ children }: { children: React.ReactNode }) => {
  const [trigger, setTrigger] = useState(0);
  const refresh = () => setTrigger(prev => prev + 1);

  return (
    <RemindersContext.Provider value={{ trigger, refresh }}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useRemindersContext = () => useContext(RemindersContext);