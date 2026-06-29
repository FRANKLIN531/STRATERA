import type { DbEngine } from './db-client';

export function bindSql(sql: string, engine: DbEngine): string {
  if (engine === 'sqlite') return sql;
  let index = 0;
  if (engine === 'postgresql') {
    return sql.replace(/\?/g, () => `$${++index}`);
  }
  return sql.replace(/\?/g, () => `@p${++index}`);
}
