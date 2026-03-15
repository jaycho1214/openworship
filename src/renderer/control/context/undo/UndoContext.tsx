import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
  useEffect,
} from 'react';

/** An undoable CRUD action (add/delete/reorder items, etc.) */
export interface UndoableAction {
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  timestamp: number;
}

interface UndoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushAction: (action: Omit<UndoableAction, 'timestamp'>) => void;
  lastAction: string | null;
}

const UndoContext = createContext<UndoContextType | null>(null);

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

interface UndoProviderProps {
  children: ReactNode;
  maxStackSize?: number;
}

export function UndoProvider({
  children,
  maxStackSize = 20,
}: UndoProviderProps) {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const pushAction = useCallback(
    (action: Omit<UndoableAction, 'timestamp'>) => {
      const entry: UndoableAction = { ...action, timestamp: Date.now() };
      setUndoStack((prev) => {
        const newStack = [...prev, entry];
        if (newStack.length > maxStackSize) {
          return newStack.slice(-maxStackSize);
        }
        return newStack;
      });
      // New action clears redo stack
      setRedoStack([]);
      setLastAction(null);
    },
    [maxStackSize],
  );

  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;

    const action = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);
    setLastAction('undo');

    // Execute the undo callback
    Promise.resolve(action.undo()).catch(console.error);
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;

    const action = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);
    setLastAction('redo');

    // Execute the redo callback
    Promise.resolve(action.redo()).catch(console.error);
  }, []);

  // Clear last action notification after a delay
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  const contextValue = useMemo(
    () => ({
      canUndo,
      canRedo,
      undo,
      redo,
      pushAction,
      lastAction,
    }),
    [canUndo, canRedo, undo, redo, pushAction, lastAction],
  );

  return (
    <UndoContext.Provider value={contextValue}>{children}</UndoContext.Provider>
  );
}
