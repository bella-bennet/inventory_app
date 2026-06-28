import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { InventorySheet, Toast, Column } from './types';
import { generateId } from './utils';

const STORAGE_KEY = 'inventory_app_data';
const MAX_HISTORY = 50;

interface HistoryEntry {
  sheets: InventorySheet[];
}

interface State {
  sheets: InventorySheet[];
  activeSheetId: string | null;
  toasts: Toast[];
  darkMode: boolean;
  history: HistoryEntry[];
  historyIndex: number;
}

type Action =
  | { type: 'SET_SHEETS'; sheets: InventorySheet[] }
  | { type: 'CREATE_SHEET' }
  | { type: 'DELETE_SHEET'; id: string }
  | { type: 'RENAME_SHEET'; id: string; name: string }
  | { type: 'DUPLICATE_SHEET'; id: string }
  | { type: 'TOGGLE_PIN'; id: string }
  | { type: 'SET_ACTIVE_SHEET'; id: string | null }
  | { type: 'UPDATE_SHEET'; id: string; data: Partial<InventorySheet> }
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' };

function defaultColumns(): Column[] {
  return [
    { id: generateId(), name: 'Date' },
    { id: generateId(), name: 'Bag' },
    { id: generateId(), name: 'Weight' },
    { id: generateId(), name: 'Supply Rate' },
    { id: generateId(), name: "Aarthi's Name" },
  ];
}

function createNewSheet(): InventorySheet {
  const now = Date.now();
  const cols = defaultColumns();
  return {
    id: generateId(),
    name: 'Untitled',
    createdAt: now,
    lastEditedAt: now,
    pinned: false,
    columns: cols,
    rows: [cols.map(() => '')],
    columnWidths: {},
    rowHeights: {},
  };
}

function saveToDisk(sheets: InventorySheet[], darkMode: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets, darkMode }));
  } catch { }
}

function loadFromDisk(): { sheets: InventorySheet[]; darkMode: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.sheets)) {
      return { sheets: parsed.sheets, darkMode: !!parsed.darkMode };
    }
    return null;
  } catch {
    return null;
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SHEETS':
      return { ...state, sheets: action.sheets };

    case 'CREATE_SHEET': {
      const sheet = createNewSheet();
      return {
        ...state,
        sheets: [sheet, ...state.sheets],
        activeSheetId: sheet.id,
      };
    }

    case 'DELETE_SHEET': {
      const sheets = state.sheets.filter(s => s.id !== action.id);
      const activeSheetId = state.activeSheetId === action.id ? null : state.activeSheetId;
      return { ...state, sheets, activeSheetId };
    }

    case 'RENAME_SHEET': {
      const sheets = state.sheets.map(s =>
        s.id === action.id ? { ...s, name: action.name, lastEditedAt: Date.now() } : s
      );
      return { ...state, sheets };
    }

    case 'DUPLICATE_SHEET': {
      const src = state.sheets.find(s => s.id === action.id);
      if (!src) return state;
      const dup: InventorySheet = {
        ...JSON.parse(JSON.stringify(src)),
        id: generateId(),
        name: src.name + ' (Copy)',
        createdAt: Date.now(),
        lastEditedAt: Date.now(),
        pinned: false,
      };
      const idx = state.sheets.findIndex(s => s.id === action.id);
      const sheets = [...state.sheets];
      sheets.splice(idx + 1, 0, dup);
      return { ...state, sheets, activeSheetId: dup.id };
    }

    case 'TOGGLE_PIN': {
      const sheets = state.sheets.map(s =>
        s.id === action.id ? { ...s, pinned: !s.pinned } : s
      );
      return { ...state, sheets };
    }

    case 'SET_ACTIVE_SHEET':
      return { ...state, activeSheetId: action.id };

    case 'UPDATE_SHEET': {
      const sheets = state.sheets.map(s =>
        s.id === action.id
          ? { ...s, ...action.data, lastEditedAt: Date.now() }
          : s
      );
      return { ...state, sheets };
    }

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return {
        ...state,
        sheets: JSON.parse(JSON.stringify(state.history[idx].sheets)),
        historyIndex: idx,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return {
        ...state,
        sheets: JSON.parse(JSON.stringify(state.history[idx].sheets)),
        historyIndex: idx,
      };
    }

    case 'PUSH_HISTORY': {
      const entry: HistoryEntry = { sheets: JSON.parse(JSON.stringify(state.sheets)) };
      const history = state.history.slice(0, state.historyIndex + 1);
      history.push(entry);
      if (history.length > MAX_HISTORY) history.shift();
      return { ...state, history, historyIndex: history.length - 1 };
    }

    default:
      return state;
  }
}

interface StoreContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  addToast: (message: string, type?: Toast['type']) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const saved = loadFromDisk();
  const [state, dispatch] = useReducer(reducer, {
    sheets: saved?.sheets || [],
    activeSheetId: null,
    toasts: [],
    darkMode: saved?.darkMode ?? false,
    history: [],
    historyIndex: -1,
  });

  const initialRef = useRef(true);

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    saveToDisk(state.sheets, state.darkMode);
  }, [state.sheets, state.darkMode]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = generateId();
    dispatch({ type: 'ADD_TOAST', toast: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 3000);
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, addToast }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
