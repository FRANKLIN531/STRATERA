declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string): unknown;
    export(): Uint8Array;
    close(): void;
    prepare(sql: string): Statement;
    getRowsModified(): number;
  }

  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    get(): unknown[];
    getAsObject(): Record<string, unknown>;
    free(): void;
    run(...params: unknown[]): void;
    reset(): void;
  }

  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
}
