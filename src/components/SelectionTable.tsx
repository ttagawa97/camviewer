import { useEffect, useState } from "react";
import { formatDateTime, statusLabel } from "../utils/format";

export function SelectionTable<T extends object>({
  title,
  searchPlaceholder,
  emptyMessage,
  rows,
  columns,
  onSearch,
  onSelect,
  backLabel,
  onBack,
  actionLabel,
  onAction,
  selectedActionLabel,
  onSelectedAction,
  deleteLabel,
  onDelete
}: {
  title: string;
  searchPlaceholder: string;
  emptyMessage: string;
  rows: T[];
  columns: [string, string][];
  onSearch: (keyword: string) => void;
  onSelect: (row: T) => void;
  backLabel?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  selectedActionLabel?: string;
  onSelectedAction?: (row: T) => void;
  deleteLabel?: string;
  onDelete?: (row: T) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    setSelectedIndex((current) => {
      if (rows.length === 0) return 0;
      return Math.min(current, rows.length - 1);
    });
  }, [rows.length]);
  const selectedRow = rows[selectedIndex] ?? null;
  const readCell = (row: T, key: string) => (row as Record<string, unknown>)[key];

  return (
    <section className="content-panel">
      <div className="toolbar">
        <h2>{title}</h2>
        <div className="toolbar-actions">
          <input className="search" placeholder={searchPlaceholder} onChange={(event) => onSearch(event.target.value)} />
          {actionLabel && <button type="button" className="primary" onClick={onAction}>{actionLabel}</button>}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className={index === selectedIndex ? "selected" : ""}
                key={String(Object.values(row)[0])}
                onClick={() => setSelectedIndex(index)}
                onDoubleClick={() => onSelect(row)}
              >
                {columns.map(([key]) => (
                  <td key={key}>
                    {key.includes("at")
                      ? formatDateTime(readCell(row, key) as string | null)
                      : statusLabel(readCell(row, key) as string) === "-"
                        ? String(readCell(row, key) ?? "-")
                        : statusLabel(readCell(row, key) as string)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-state">{emptyMessage}</div>}
      </div>
      <div className="footer-actions">
        {backLabel && <button className="ghost" onClick={onBack}>{backLabel}</button>}
        {selectedActionLabel && onSelectedAction && (
          <button disabled={!selectedRow} onClick={() => selectedRow && onSelectedAction(selectedRow)}>
            {selectedActionLabel}
          </button>
        )}
        {deleteLabel && onDelete && (
          <button className="ghost danger" disabled={!selectedRow} onClick={() => selectedRow && onDelete(selectedRow)}>
            {deleteLabel}
          </button>
        )}
        <button className="primary" disabled={!selectedRow} onClick={() => selectedRow && onSelect(selectedRow)}>
          選択
        </button>
      </div>
    </section>
  );
}
