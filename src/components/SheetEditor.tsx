import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { InventorySheet, Column } from '../types';
import { generateId } from '../utils';
import { useStore } from '../store';

interface Props {
  sheetId: string;
  onBack: () => void;
}

export function SheetEditor({ sheetId, onBack }: Props) {
  const { state, dispatch, addToast } = useStore();
  const sheet = useMemo(() => state.sheets.find(s => s.id === sheetId), [state.sheets, sheetId]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerValue, setHeaderValue] = useState('');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    if (sheet) {
      setColWidths(sheet.columnWidths || {});
    }
  }, [sheet?.id]);

  const pushHistory = useCallback(() => {
    dispatch({ type: 'PUSH_HISTORY' });
  }, [dispatch]);

  const updateSheet = useCallback((data: Partial<InventorySheet>) => {
    dispatch({ type: 'UPDATE_SHEET', id: sheetId, data });
  }, [dispatch, sheetId]);

  if (!sheet) {
    return (
      <div className="editor-empty">
        <p>Sheet not found</p>
        <button className="btn btn-primary" onClick={onBack}>Go back</button>
      </div>
    );
  }

  const s = sheet;

  function handleCellClick(row: number, col: number, value: string) {
    setEditingCell({ row, col });
    setEditValue(value);
  }

  function handleCellSave() {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const newRows = s.rows.map((r, ri) =>
      ri === row ? r.map((c, ci) => ci === col ? editValue : c) : r
    );
    pushHistory();
    updateSheet({ rows: newRows });
    setEditingCell(null);
  }

  function handleCellKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') setEditingCell(null);
    if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave();
      if (editingCell) {
        const { row, col } = editingCell;
        const nextCol = col + 1;
        if (nextCol < s.columns.length) {
          handleCellClick(row, nextCol, s.rows[row]?.[nextCol] || '');
        } else if (row + 1 < s.rows.length) {
          handleCellClick(row + 1, 0, s.rows[row + 1]?.[0] || '');
        }
      }
    }
  }

  function handleHeaderClick(colId: string, name: string) {
    setEditingHeader(colId);
    setHeaderValue(name);
  }

  function handleHeaderSave() {
    if (!editingHeader) return;
    const trimmed = headerValue.trim();
    if (!trimmed) { setEditingHeader(null); return; }
    const newCols = s.columns.map(c =>
      c.id === editingHeader ? { ...c, name: trimmed } : c
    );
    pushHistory();
    updateSheet({ columns: newCols });
    addToast('Column renamed');
    setEditingHeader(null);
  }

  function addRow() {
    pushHistory();
    updateSheet({ rows: [...s.rows, s.columns.map(() => '')] });
    addToast('Row added');
  }

  function deleteRow(idx: number) {
    if (s.rows.length <= 1) {
      pushHistory();
      updateSheet({ rows: [s.columns.map(() => '')] });
      addToast('Last row cleared');
      return;
    }
    pushHistory();
    updateSheet({ rows: s.rows.filter((_, i) => i !== idx) });
    addToast('Row deleted');
  }

  function addColumn() {
    pushHistory();
    const newCol: Column = { id: generateId(), name: 'New' };
    const newRows = s.rows.map(r => [...r, '']);
    updateSheet({ columns: [...s.columns, newCol], rows: newRows, columnWidths: { ...colWidths } });
    addToast('Column added');
  }

  function deleteColumn(colIdx: number) {
    if (s.columns.length <= 1) {
      addToast('Need at least one column', 'error');
      return;
    }
    pushHistory();
    const col = s.columns[colIdx];
    const newCols = s.columns.filter((_, i) => i !== colIdx);
    const newRows = s.rows.map(r => r.filter((_, i) => i !== colIdx));
    const newWidths = { ...colWidths };
    delete newWidths[col.id];
    updateSheet({ columns: newCols, rows: newRows, columnWidths: newWidths });
    addToast('Column deleted');
  }

  function handleColumnDragStart(colId: string) {
    setDraggedCol(colId);
  }

  function handleColumnDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOverCol(colId);
  }

  function handleColumnDrop(e: React.DragEvent, targetColId: string) {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetColId) {
      setDraggedCol(null);
      setDragOverCol(null);
      return;
    }
    const cols = [...s.columns];
    const srcIdx = cols.findIndex(c => c.id === draggedCol);
    const tgtIdx = cols.findIndex(c => c.id === targetColId);
    if (srcIdx === -1 || tgtIdx === -1) { setDraggedCol(null); setDragOverCol(null); return; }
    const [moved] = cols.splice(srcIdx, 1);
    cols.splice(tgtIdx, 0, moved);
    const newRows = s.rows.map(r => {
      const row = [...r];
      const [cell] = row.splice(srcIdx, 1);
      row.splice(tgtIdx, 0, cell);
      return row;
    });
    pushHistory();
    updateSheet({ columns: cols, rows: newRows });
    setDraggedCol(null);
    setDragOverCol(null);
  }

  function handleColumnResizeStart(e: React.MouseEvent, colId: string) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colId] || 120;

    function onMouseMove(ev: MouseEvent) {
      const diff = ev.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      setColWidths(prev => ({ ...prev, [colId]: newWidth }));
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      pushHistory();
      const latest = colWidthsRef.current;
      updateSheet({ columnWidths: { ...latest, [colId]: latest[colId] || 120 } });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function getColWidth(colId: string): number {
    return colWidths[colId] || 120;
  }

  return (
    <div className="sheet-editor">
      <header className="editor-header">
        <button className="btn btn-icon" onClick={onBack} title="Back to home">
          ←
        </button>
        <div className="editor-title-group">
          <input
            className="editor-title-input"
            value={s.name}
            onChange={e => dispatch({ type: 'RENAME_SHEET', id: sheetId, name: e.target.value })}
            onBlur={e => {
              if (e.currentTarget.value !== state.sheets.find(ss => ss.id === sheetId)?.name) {
                addToast('Sheet renamed');
              }
            }}
          />
        </div>
        <div className="editor-actions">
          <button
            className="btn btn-icon"
            onClick={() => { dispatch({ type: 'UNDO' }); addToast('Undo', 'info'); }}
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            className="btn btn-icon"
            onClick={() => { dispatch({ type: 'REDO' }); addToast('Redo', 'info'); }}
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>
          <button
            className="theme-toggle"
            onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            title={state.darkMode ? 'Light mode' : 'Dark mode'}
          >
            {state.darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="table-wrapper" ref={tableRef}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th className="row-number-header">#</th>
              {s.columns.map((col, ci) => (
                <th
                  key={col.id}
                  className={`col-header ${dragOverCol === col.id ? 'col-drag-over' : ''} ${draggedCol === col.id ? 'col-dragging' : ''}`}
                  style={{ width: getColWidth(col.id), minWidth: getColWidth(col.id) }}
                  draggable
                  onDragStart={() => handleColumnDragStart(col.id)}
                  onDragOver={e => handleColumnDragOver(e, col.id)}
                  onDrop={e => handleColumnDrop(e, col.id)}
                  onDragEnd={() => { setDraggedCol(null); setDragOverCol(null); }}
                >
                  <div className="col-header-content">
                    {editingHeader === col.id ? (
                      <input
                        className="header-edit-input"
                        value={headerValue}
                        onChange={e => setHeaderValue(e.target.value)}
                        onBlur={handleHeaderSave}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleHeaderSave();
                          if (e.key === 'Escape') setEditingHeader(null);
                        }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="col-header-name"
                        onDoubleClick={() => handleHeaderClick(col.id, col.name)}
                      >
                        {col.name}
                      </span>
                    )}
                    <button
                      className="col-delete-btn"
                      onClick={e => { e.stopPropagation(); deleteColumn(ci); }}
                      title="Delete column"
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    className="col-resize-handle"
                    onMouseDown={e => handleColumnResizeStart(e, col.id)}
                    title="Drag to resize"
                  />
                </th>
              ))}
              <th className="col-actions-header" />
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, ri) => (
              <tr key={ri} className="table-row">
                <td className="row-number-cell">
                  <span className="row-number">{ri + 1}</span>
                  <button
                    className="row-delete-btn"
                    onClick={() => deleteRow(ri)}
                    title="Delete row"
                  >
                    ✕
                  </button>
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`table-cell ${editingCell?.row === ri && editingCell?.col === ci ? 'cell-editing' : ''}`}
                    style={{ width: getColWidth(s.columns[ci]?.id), minWidth: getColWidth(s.columns[ci]?.id) }}
                    onClick={() => !(editingCell?.row === ri && editingCell?.col === ci) && handleCellClick(ri, ci, cell)}
                  >
                    {editingCell?.row === ri && editingCell?.col === ci ? (
                      <input
                        className="cell-input"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={handleCellKeyDown}
                        autoFocus
                      />
                    ) : (
                      <span className="cell-text">{cell || <span className="cell-placeholder">—</span>}</span>
                    )}
                  </td>
                ))}
                <td className="row-actions-cell" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="floating-actions">
        <button className="fab fab-sm" onClick={addRow} title="Add row">
          <span>+</span> Row
        </button>
        <button className="fab fab-sm fab-col" onClick={addColumn} title="Add column">
          <span>+</span> Col
        </button>
      </div>

      <div className="editor-status">
        {s.rows.length} row{s.rows.length !== 1 ? 's' : ''} · {s.columns.length} column{s.columns.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
