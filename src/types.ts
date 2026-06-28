export interface Column {
  id: string;
  name: string;
}

export interface InventorySheet {
  id: string;
  name: string;
  createdAt: number;
  lastEditedAt: number;
  pinned: boolean;
  columns: Column[];
  rows: string[][];
  columnWidths: Record<string, number>;
  rowHeights: Record<number, number>;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface SheetStore {
  sheets: InventorySheet[];
  activeSheetId: string | null;
  toasts: Toast[];
  darkMode: boolean;
}
