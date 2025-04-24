/**
 * 글로벌 타입 선언
 */

// Node.js 환경 타입 선언
declare namespace NodeJS {
  interface Process {
    env: Record<string, string | undefined>;
  }
  
  interface Global {
    process: Process;
  }
}

// Buffer 타입 선언
interface Buffer extends Uint8Array {
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(start?: number, end?: number): Buffer;
}

declare const Buffer: {
  new(str: string, encoding?: string): Buffer;
  new(size: number): Buffer;
  new(array: Uint8Array): Buffer;
  new(arrayBuffer: ArrayBuffer | SharedArrayBuffer): Buffer;
  new(array: readonly any[]): Buffer;
  new(buffer: Buffer): Buffer;
  alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
  allocUnsafe(size: number): Buffer;
  from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
  from(data: readonly any[]): Buffer;
  from(data: Uint8Array): Buffer;
  from(str: string, encoding?: string): Buffer;
};

// dotenv 모듈 타입 선언
declare module 'dotenv' {
  export function config(): { parsed?: { [key: string]: string } };
}

// express 모듈 타입 선언 (간소화)
declare module 'express' {
  export interface Request {
    [key: string]: any;
  }
  
  export interface Response {
    status(code: number): this;
    json(body: any): this;
    send(body: any): this;
    end(): this;
    [key: string]: any;
  }
  
  export interface Router {
    get(path: string, ...handlers: any[]): this;
    post(path: string, ...handlers: any[]): this;
    put(path: string, ...handlers: any[]): this;
    delete(path: string, ...handlers: any[]): this;
    use(...handlers: any[]): this;
    [key: string]: any;
  }
  
  export function Router(): Router;
  
  export default function express(): any;
}

// node-fetch 모듈 타입 선언 (간소화)
declare module 'node-fetch' {
  export default function fetch(url: string, init?: RequestInit): Promise<Response>;
  
  export interface Response {
    ok: boolean;
    status: number;
    statusText: string;
    text(): Promise<string>;
    json(): Promise<any>;
  }
  
  export interface RequestInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
}

// fs 모듈 타입 선언 (간소화)
declare module 'fs' {
  export function readFileSync(path: string, options?: { encoding?: string; flag?: string } | string): string | Buffer;
  export function writeFileSync(path: string, data: string | Buffer, options?: { encoding?: string; mode?: number; flag?: string } | string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number } | number): string;
  export function readdirSync(path: string, options?: { encoding?: string; withFileTypes?: boolean } | string): string[] | any[];
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean; size: number; mtime: Date; };
}

// path 모듈 타입 선언
declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function parse(path: string): { root: string; dir: string; base: string; ext: string; name: string; };
  export function isAbsolute(path: string): boolean;
  export const sep: string;
} 