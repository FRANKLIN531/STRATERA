import type { DbEngine } from './db-client';

export function bindSql(sql: string, engine: DbEngine): string {
  if (engine === 'sqlite') return sql;
  let index = 0;
  if (engine === 'postgresql') {
    return sql.replace(/\?/g, () => `$${++index}`);
  }
  return sql.replace(/\?/g, () => `@p${++index}`);
}

/**
 * Adapt SQLite-style SQL for the active engine.
 * MSSQL does not support trailing LIMIT — rewrite to SELECT TOP (n).
 */
export function adaptSql(sql: string, engine: DbEngine): string {
  let text = sql.trim();

  if (engine === 'mssql') {
    const limitOnly = text.match(/\s+LIMIT\s+(\d+)\s*;?\s*$/i);
    if (limitOnly) {
      const n = limitOnly[1];
      text = text.replace(/\s+LIMIT\s+\d+\s*;?\s*$/i, '');
      text = text.replace(/^SELECT\s+/i, `SELECT TOP (${n}) `);
    }

    text = text.replace(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z_][\w]*)/gi,
      (_m, table: string) =>
        `IF OBJECT_ID(N'${table}', N'U') IS NULL CREATE TABLE ${table}`,
    );

    // Prefer bounded NVARCHAR so PRIMARY KEY columns stay valid on SQL Server.
    text = text
      .replace(/\bTEXT\s+PRIMARY\s+KEY\b/gi, 'NVARCHAR(64) NOT NULL PRIMARY KEY')
      .replace(/\bTEXT\b/gi, 'NVARCHAR(255)')
      .replace(/\bREAL\b/gi, 'DECIMAL(18,2)')
      .replace(/\bINTEGER\b/gi, 'INT');
  }

  return bindSql(text, engine);
}
