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

// Type for undoable projection state
interface ProjectionStateSnapshot {
  itemIndex: number;
  slideIndex: number;
  isBlank: boolean;
  isVerseHidden: boolean;
  timestamp: number;
}

interface UndoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => ProjectionStateSnapshot | null;
  redo: () => ProjectionStateSnapshot | null;
  pushState: (state: Omit<ProjectionStateSnapshot, 'timestamp'>) => void;
  clearHistory: () => void;
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
  maxStackSize = 10,
}: UndoProviderProps) {
  const [undoStack, setUndoStack] = useState<ProjectionStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectionStateSnapshot[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Debounce to prevent rapid consecutive pushes from same action
  const lastPushTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 100;

  const canUndo = undoStack.length > 1; // Need at least 2 states to undo
  const canRedo = redoStack.length > 0;

  const pushState = useCallback(
    (state: Omit<ProjectionStateSnapshot, 'timestamp'>) => {
      const now = Date.now();
      if (now - lastPushTimeRef.current < DEBOUNCE_MS) {
        return;
      }
      lastPushTimeRef.current = now;

      const snapshot: ProjectionStateSnapshot = {
        ...state,
        timestamp: now,
      };

      setUndoStack((prev) => {
        // Don't push if the state is identical to the last one
        const last = prev[prev.length - 1];
        if (
          last &&
          last.itemIndex === state.itemIndex &&
          last.slideIndex === state.slideIndex &&
          last.isBlank === state.isBlank &&
          last.isVerseHidden === state.isVerseHidden
        ) {
          return prev;
        }

        const newStack = [...prev, snapshot];
        // Keep stack size limited
        if (newStack.length > maxStackSize) {
          return newStack.slice(-maxStackSize);
        }
        return newStack;
      });

      // Clear redo stack when new action is performed
      setRedoStack([]);
      setLastAction(null);
    },
    [maxStackSize],
  );

  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  const undo = useCallback((): ProjectionStateSnapshot | null => {
    const stack = undoStackRef.current;
    if (stack.length <= 1) return null;

    const currentState = stack[stack.length - 1];
    const previousState = stack[stack.length - 2];

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentState]);
    setLastAction('undo');

    return previousState;
  }, []);

  const redo = useCallback((): ProjectionStateSnapshot | null => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return null;

    const nextState = stack[stack.length - 1];

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, nextState]);
    setLastAction('redo');

    return nextState;
  }, []);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    setLastAction(null);
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
      pushState,
      clearHistory,
      lastAction,
    }),
    [canUndo, canRedo, undo, redo, pushState, clearHistory, lastAction],
  );

  return (
    <UndoContext.Provider value={contextValue}>{children}</UndoContext.Provider>
  );
}
