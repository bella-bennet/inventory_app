import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { SheetCard } from './SheetCard';
import { EmptyState } from './EmptyState';

interface Props {
  onEditSheet: (id: string) => void;
}

export function Home({ onEditSheet }: Props) {
  const { state, dispatch, addToast } = useStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = [...state.sheets];
    if (q) {
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastEditedAt - a.lastEditedAt;
    });
    return list;
  }, [state.sheets, search]);

  function handleNewSheet() {
    dispatch({ type: 'CREATE_SHEET' });
    addToast('New sheet created');
  }

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-header-top">
          <h1 className="app-title">Khurshid's Profile</h1>
          <div className="home-header-actions">
            <button
              className="theme-toggle"
              onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              aria-label="Toggle dark mode"
              title={state.darkMode ? 'Light mode' : 'Dark mode'}
            >
              {state.darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search sheets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </header>

      {filtered.length === 0 ? (
        search ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h2 className="empty-state-title">No sheets found</h2>
            <p className="empty-state-text">Try a different search term</p>
          </div>
        ) : (
          <EmptyState onNewSheet={handleNewSheet} />
        )
      ) : (
        <div className="sheet-grid">
          {filtered.map(sheet => (
            <SheetCard key={sheet.id} sheet={sheet} onEdit={onEditSheet} />
          ))}
        </div>
      )}

      <button className="fab" onClick={handleNewSheet} aria-label="Create new sheet" title="New sheet">
        <span>+</span>
      </button>
    </div>
  );
}
