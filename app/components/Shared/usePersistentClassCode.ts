"use client";

import { useCallback, useEffect, useState } from "react";

export const LAST_CLASS_KEY = "lastSearchedClass";
const LAST_CLASS_CHANGED_EVENT = "lastSearchedClassChanged";

export function getPersistedClassCode(): string {
  if (globalThis.window === undefined) {
    return "";
  }
  return localStorage.getItem(LAST_CLASS_KEY) || "";
}

function persistClassCode(classCode: string) {
  if (globalThis.window === undefined) {
    return;
  }
  localStorage.setItem(LAST_CLASS_KEY, classCode);
  window.dispatchEvent(new Event(LAST_CLASS_CHANGED_EVENT));
}

export function usePersistentClassCode() {
  const [classCode, setClassCodeState] = useState(getPersistedClassCode);

  useEffect(() => {
    const syncClassCode = () => {
      setClassCodeState(getPersistedClassCode());
    };

    window.addEventListener("storage", syncClassCode);
    window.addEventListener(LAST_CLASS_CHANGED_EVENT, syncClassCode);
    return () => {
      window.removeEventListener("storage", syncClassCode);
      window.removeEventListener(LAST_CLASS_CHANGED_EVENT, syncClassCode);
    };
  }, []);

  const setClassCode = useCallback((value: string) => {
    const normalized = value.toUpperCase();
    setClassCodeState(normalized);
    persistClassCode(normalized);
  }, []);

  return [classCode, setClassCode] as const;
}
