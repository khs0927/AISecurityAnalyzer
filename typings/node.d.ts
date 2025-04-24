// node.d.ts
declare namespace NodeJS {
  interface Process {
    env: {
      [key: string]: string | undefined;
      NODE_ENV?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_USER?: string;
      DB_PASSWORD?: string;
      DB_NAME?: string;
      DB_SCHEMA?: string;
      ENABLE_QUERY_LOG?: string;
    };
    cwd(): string;
    version: string;
    versions: {
      node: string;
      [key: string]: string;
    };
    platform: string;
    arch: string;
    pid: number;
    memoryUsage(): {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  }

  interface Global {
    process: Process;
  }
}

declare var process: NodeJS.Process;
declare var global: NodeJS.Global; 