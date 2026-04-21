import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface AIModalLockContextValue {
  count: number;
  acquire: () => void;
  release: () => void;
}

const AIModalLockContext = createContext<AIModalLockContextValue | null>(null);

export function AIModalLockProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const acquire = useCallback(() => setCount((c) => c + 1), []);
  const release = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  const value = useMemo<AIModalLockContextValue>(
    () => ({ count, acquire, release }),
    [count, acquire, release],
  );

  return <AIModalLockContext.Provider value={value}>{children}</AIModalLockContext.Provider>;
}

export function useAIModalLocked(): boolean {
  const ctx = useContext(AIModalLockContext);
  return (ctx?.count ?? 0) > 0;
}

export function useRegisterAIModal(active: boolean): void {
  const ctx = useContext(AIModalLockContext);
  const acquireRef = useRef(ctx?.acquire);
  const releaseRef = useRef(ctx?.release);
  acquireRef.current = ctx?.acquire;
  releaseRef.current = ctx?.release;

  useEffect(() => {
    if (!active) return;
    acquireRef.current?.();
    return () => {
      releaseRef.current?.();
    };
  }, [active]);
}
