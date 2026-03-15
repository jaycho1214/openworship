/* eslint-disable no-console */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

import { getElectron } from '../../../shared/hooks/useElectron';
import type { DbSession } from '../../../../shared/types';

interface SessionContextType {
  currentSessionId: string | null;
  createSession: (name: string) => Promise<DbSession | null>;
  loadSession: (sessionId: string) => Promise<DbSession | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, newName: string) => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const createSession = useCallback(
    async (name: string): Promise<DbSession | null> => {
      const electron = getElectron();
      if (!electron) return null;

      try {
        const result = await electron.session.create(name);
        if (result.success && result.data) {
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to create session:', error);
        return null;
      }
    },
    [],
  );

  const loadSession = useCallback(
    async (sessionId: string): Promise<DbSession | null> => {
      const electron = getElectron();
      if (!electron) return null;

      try {
        const result = await electron.session.getById(sessionId);
        if (result.success && result.data) {
          setCurrentSessionId(sessionId);
          return result.data;
        }
        return null;
      } catch (error) {
        console.error('Failed to load session:', error);
        return null;
      }
    },
    [],
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const electron = getElectron();
      if (!electron) return false;

      try {
        const result = await electron.session.delete(sessionId);
        if (result.success) {
          if (sessionId === currentSessionId) {
            setCurrentSessionId(null);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to delete session:', error);
        return false;
      }
    },
    [currentSessionId],
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string): Promise<boolean> => {
      const electron = getElectron();
      if (!electron) return false;

      try {
        const result = await electron.session.update(sessionId, {
          name: newName,
        });
        return result.success;
      } catch (error) {
        console.error('Failed to rename session:', error);
        return false;
      }
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      currentSessionId,
      createSession,
      loadSession,
      deleteSession,
      renameSession,
    }),
    [
      currentSessionId,
      createSession,
      loadSession,
      deleteSession,
      renameSession,
    ],
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}
