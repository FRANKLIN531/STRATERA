import React from 'react';
import { strateraTheme } from '../theme';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  return (
    <div
      style={{
        background: strateraTheme.colors.white,
        borderRadius: 12,
        border: `1px solid ${strateraTheme.colors.gray200}`,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: strateraTheme.colors.gray50 }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  color: strateraTheme.colors.gray500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: col.width,
                  borderBottom: `1px solid ${strateraTheme.colors.gray200}`,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 48,
                  textAlign: 'center',
                  color: strateraTheme.colors.gray400,
                  fontSize: 14,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = strateraTheme.colors.gray50;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '16px 20px',
                      fontSize: 14,
                      color: strateraTheme.colors.gray700,
                      borderBottom: `1px solid ${strateraTheme.colors.gray100}`,
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
