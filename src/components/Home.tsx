import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { SheetCard } from './SheetCard';
import { EmptyState } from './EmptyState';

interface Props {
  onEditSheet: (id: string) => void;
}

export function Home({ onEditSheet }: Props) {
  const { state, dispatch, addToast } = useStore();
  const [search, setSearch] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileInput, setProfileInput] = useState(state.profileName);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProfile && profileInputRef.current) {
      profileInputRef.current.focus();
      profileInputRef.current.select();
    }
  }, [editingProfile]);

  useEffect(() => {
    setProfileInput(state.profileName);
  }, [state.profileName]);

  function handleProfileSave() {
    const trimmed = profileInput.trim();
    if (trimmed && trimmed !== state.profileName) {
      dispatch({ type: 'SET_PROFILE_NAME', name: trimmed });
      addToast('Profile name updated');
    } else {
      setProfileInput(state.profileName);
    }
    setEditingProfile(false);
  }

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
          {editingProfile ? (
            <input
              ref={profileInputRef}
              className="app-title-input"
              value={profileInput}
              onChange={e => setProfileInput(e.target.value)}
              onBlur={handleProfileSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleProfileSave();
                if (e.key === 'Escape') { setProfileInput(state.profileName); setEditingProfile(false); }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h1 className="app-title" onClick={() => setEditingProfile(true)} title="Click to rename">
              {state.profileName}
            </h1>
          )}
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
