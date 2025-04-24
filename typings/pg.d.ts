declare module 'pg' {
  export class Pool {
    constructor(options: any);
    connect(): Promise<PoolClient>;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
    on(event: string, listener: Function): this;
  }

  export class Client {
    constructor(options: any);
    connect(): Promise<void>;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export interface QueryResult<T> {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: any[];
  }
} 