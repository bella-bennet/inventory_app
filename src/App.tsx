import { useEffect, useCallback } from 'react';
import { StoreProvider, useStore } from './store';
import { Home } from './components/Home';
import { SheetEditor } from './components/SheetEditor';
import { ToastContainer } from './components/Toast';

function AppContent() {
  const { state, dispatch } = useStore();

  const goHome = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_SHEET', id: null });
  }, [dispatch]);

  const goToSheet = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_SHEET', id });
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  }, [state.darkMode]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div className="app">
      {state.activeSheetId ? (
        <SheetEditor sheetId={state.activeSheetId} onBack={goHome} />
      ) : (
        <Home onEditSheet={goToSheet} />
      )}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
