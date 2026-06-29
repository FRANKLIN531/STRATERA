import type { DbClient, DbEngine } from './db-client';

function quoteColumn(engine: DbEngine, column: string): string {
  if (column !== 'key') return column;
  if (engine === 'postgresql') return '"key"';
  if (engine === 'mssql') return '[key]';
  return column;
}

export function hasColumn(db: DbClient, table: string, column: string): boolean {
  return db.getTableColumns(table).some((c) => c.name === column);
}

export function addColumnIfMissing(
  db: DbClient,
  table: string,
  column: string,
  definition: string,
): void {
  if (hasColumn(db, table, column)) return;

  let ddl = definition;
  if (db.engine === 'postgresql') {
    ddl = definition
      .replace(/\bREAL\b/g, 'DECIMAL(18,2)')
      .replace(/\bTEXT\b/g, 'VARCHAR(255)');
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    return;
  }
  if (db.engine === 'mssql') {
    ddl = definition
      .replace(/\bREAL\b/g, 'DECIMAL(18,2)')
      .replace(/\bTEXT\b/g, 'NVARCHAR(255)')
      .replace(/\bINTEGER\b/g, 'INT');
    db.exec(`ALTER TABLE ${table} ADD ${column} ${ddl}`);
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

const TABLE_PRIMARY_KEYS: Record<string, string> = {
  hr_settings: 'key',
  leave_balances: 'employee_id',
};

export function primaryKeyColumn(table: string): string {
  return TABLE_PRIMARY_KEYS[table] ?? 'id';
}

export function sqlInsertIgnore(
  engine: DbEngine,
  table: string,
  columns: string[],
  conflictColumn?: string,
): string {
  const cols = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const conflict = conflictColumn ?? primaryKeyColumn(table);

  if (engine === 'sqlite') {
    return `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`;
  }
  if (engine === 'postgresql') {
    const conflictCol = quoteColumn(engine, conflict);
    return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO NOTHING`;
  }
  if (engine === 'mssql') {
    const bracketed = quoteColumn(engine, conflict);
    return `IF NOT EXISTS (SELECT 1 FROM ${table} WHERE ${bracketed} = ?)
      INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
  }
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
}

export function sqlUpsertKeyValue(engine: DbEngine, table: string, keyCol: string, valueCol: string): string {
  const key = quoteColumn(engine, keyCol);
  const value = quoteColumn(engine, valueCol);
  if (engine === 'sqlite') {
    return `INSERT OR REPLACE INTO ${table} (${keyCol}, ${valueCol}) VALUES (?, ?)`;
  }
  if (engine === 'postgresql') {
    return `INSERT INTO ${table} (${key}, ${value}) VALUES (?, ?)
      ON CONFLICT (${key}) DO UPDATE SET ${value} = EXCLUDED.${value}`;
  }
  return `MERGE ${table} AS target
    USING (SELECT ? AS ${keyCol}, ? AS ${valueCol}) AS source
    ON target.${key} = source.${keyCol}
    WHEN MATCHED THEN UPDATE SET ${value} = source.${valueCol}
    WHEN NOT MATCHED THEN INSERT (${key}, ${value}) VALUES (source.${keyCol}, source.${valueCol});`;
}

export function sqlUpsertLeaveBalance(engine: DbEngine): string {
  const cols =
    'employee_id, annual_entitlement, sick_entitlement, annual_used, sick_used, maternity_entitlement, maternity_used, paternity_entitlement, paternity_used';
  if (engine === 'sqlite') {
    return `INSERT OR REPLACE INTO leave_balances (${cols}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  }
  if (engine === 'postgresql') {
    return `INSERT INTO leave_balances (${cols}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (employee_id) DO UPDATE SET
        annual_entitlement = EXCLUDED.annual_entitlement,
        sick_entitlement = EXCLUDED.sick_entitlement,
        annual_used = EXCLUDED.annual_used,
        sick_used = EXCLUDED.sick_used,
        maternity_entitlement = EXCLUDED.maternity_entitlement,
        maternity_used = EXCLUDED.maternity_used,
        paternity_entitlement = EXCLUDED.paternity_entitlement,
        paternity_used = EXCLUDED.paternity_used`;
  }
  return `MERGE leave_balances AS target
    USING (SELECT ? AS employee_id, ? AS annual_entitlement, ? AS sick_entitlement, ? AS annual_used, ? AS sick_used, ? AS maternity_entitlement, ? AS maternity_used, ? AS paternity_entitlement, ? AS paternity_used) AS source
    ON target.employee_id = source.employee_id
    WHEN MATCHED THEN UPDATE SET
      annual_entitlement = source.annual_entitlement,
      sick_entitlement = source.sick_entitlement,
      annual_used = source.annual_used,
      sick_used = source.sick_used,
      maternity_entitlement = source.maternity_entitlement,
      maternity_used = source.maternity_used,
      paternity_entitlement = source.paternity_entitlement,
      paternity_used = source.paternity_used
    WHEN NOT MATCHED THEN INSERT (${cols}) VALUES (source.employee_id, source.annual_entitlement, source.sick_entitlement, source.annual_used, source.sick_used, source.maternity_entitlement, source.maternity_used, source.paternity_entitlement, source.paternity_used);`;
}

export function sqlAttendanceSinceDaysAgo(engine: DbEngine, days: number): string {
  if (engine === 'sqlite') {
    return `SELECT date, status, hours FROM attendance
      WHERE date >= date('now', '-${days} days') ORDER BY date`;
  }
  if (engine === 'postgresql') {
    return `SELECT date, status, hours FROM attendance
      WHERE date::date >= (CURRENT_DATE - INTERVAL '${days} days') ORDER BY date`;
  }
  return `SELECT date, status, hours FROM attendance
    WHERE CAST(date AS DATE) >= DATEADD(day, -${days}, CAST(GETDATE() AS DATE)) ORDER BY date`;
}

export function sqlReplaceRow(engine: DbEngine, table: string, columns: string[]): string {
  const cols = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const pk = primaryKeyColumn(table);

  if (engine === 'sqlite') {
    return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`;
  }
  if (engine === 'postgresql') {
    const updates = columns
      .filter((c) => c !== pk)
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
      ON CONFLICT (${pk}) DO UPDATE SET ${updates}`;
  }
  const assignments = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = source.${c}`)
    .join(', ');
  const sourceCols = columns.map((c) => `? AS ${c}`).join(', ');
  return `MERGE ${table} AS target
    USING (SELECT ${sourceCols}) AS source
    ON target.${pk} = source.${pk}
    WHEN MATCHED THEN UPDATE SET ${assignments}
    WHEN NOT MATCHED THEN INSERT (${cols}) VALUES (${columns.map((c) => `source.${c}`).join(', ')});`;
}

export function sqlLimit(engine: DbEngine, count: number): string {
  if (engine === 'mssql') return `TOP (${count})`;
  return `LIMIT ${count}`;
}
