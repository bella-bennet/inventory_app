import { useState, useRef, useEffect } from 'react';
import type { InventorySheet } from '../types';
import { formatRelativeTime } from '../utils';
import { useStore } from '../store';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  sheet: InventorySheet;
  onEdit: (id: string) => void;
}

export function SheetCard({ sheet, onEdit }: Props) {
  const { dispatch, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(sheet.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== sheet.name) {
      dispatch({ type: 'RENAME_SHEET', id: sheet.id, name: trimmed });
      addToast('Sheet renamed');
    }
    setRenaming(false);
  }

  function handleDelete() {
    setShowDeleteConfirm(false);
    dispatch({ type: 'DELETE_SHEET', id: sheet.id });
    addToast('Sheet deleted');
    setMenuOpen(false);
  }

  function handleDuplicate() {
    dispatch({ type: 'DUPLICATE_SHEET', id: sheet.id });
    addToast('Sheet duplicated');
    setMenuOpen(false);
  }

  function handlePin() {
    dispatch({ type: 'TOGGLE_PIN', id: sheet.id });
    addToast(sheet.pinned ? 'Unpinned' : 'Pinned');
    setMenuOpen(false);
  }

  return (
    <div className="sheet-card" onClick={() => onEdit(sheet.id)}>
      <div className="sheet-card-header">
        <div className="sheet-card-name-area">
          {sheet.pinned && <span className="pin-icon">📌</span>}
          {renaming ? (
            <input
              ref={inputRef}
              className="rename-input"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3 className="sheet-card-name">{sheet.name}</h3>
          )}
        </div>
        <div className="sheet-card-menu" ref={menuRef}>
          <button
            className="three-dot-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            aria-label="Sheet options"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
              <button className="dropdown-item" onClick={() => { setRenaming(true); setMenuOpen(false); }}>
                ✏️ Rename
              </button>
              <button className="dropdown-item" onClick={handleDuplicate}>
                📋 Duplicate
              </button>
              <button className="dropdown-item" onClick={handlePin}>
                {sheet.pinned ? '📍 Unpin' : '📌 Pin'}
              </button>
              <button className="dropdown-item" onClick={() => { onEdit(sheet.id); setMenuOpen(false); }}>
                📝 Edit
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item dropdown-item-danger" onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}>
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="sheet-card-meta">
        <span className="sheet-card-date">Created {new Date(sheet.createdAt).toLocaleDateString()}</span>
        <span className="sheet-card-time">{formatRelativeTime(sheet.lastEditedAt)}</span>
      </div>
      <div className="sheet-card-preview">
        <span className="sheet-card-stat">{sheet.columns.length} columns</span>
        <span className="sheet-card-stat">{sheet.rows.length} rows</span>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete sheet?"
        message={`Are you sure you want to delete "${sheet.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
