/**
 * Node.js 환경 및 @huggingface/inference 라이브러리를 위한 타입 선언
 */

// Node.js 프로세스 및 환경 변수 타입 선언
declare namespace NodeJS {
  interface Process {
    env: Record<string, string | undefined>;
  }
  
  interface Global {
    process: Process;
  }
}

// 전역 Buffer 타입 지원
interface Buffer extends Uint8Array {
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(start?: number, end?: number): Buffer;
  writeUIntLE(value: number, offset: number, byteLength: number): number;
  writeUIntBE(value: number, offset: number, byteLength: number): number;
  writeIntLE(value: number, offset: number, byteLength: number): number;
  writeIntBE(value: number, offset: number, byteLength: number): number;
  readUIntLE(offset: number, byteLength: number): number;
  readUIntBE(offset: number, byteLength: number): number;
  readIntLE(offset: number, byteLength: number): number;
  readIntBE(offset: number, byteLength: number): number;
  readUInt8(offset: number): number;
  readUInt16LE(offset: number): number;
  readUInt16BE(offset: number): number;
  readUInt32LE(offset: number): number;
  readUInt32BE(offset: number): number;
  readInt8(offset: number): number;
  readInt16LE(offset: number): number;
  readInt16BE(offset: number): number;
  readInt32LE(offset: number): number;
  readInt32BE(offset: number): number;
  readFloatLE(offset: number): number;
  readFloatBE(offset: number): number;
  readDoubleLE(offset: number): number;
  readDoubleBE(offset: number): number;
  reverse(): Buffer;
  swap16(): Buffer;
  swap32(): Buffer;
  swap64(): Buffer;
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
  allocUnsafeSlow(size: number): Buffer;
  isBuffer(obj: any): obj is Buffer;
  byteLength(string: string | Buffer | ArrayBuffer | SharedArrayBuffer | Uint8Array | readonly any[], encoding?: string): number;
  concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
  compare(buf1: Uint8Array, buf2: Uint8Array): number;
  isEncoding(encoding: string): boolean;
  from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
  from(data: readonly any[]): Buffer;
  from(data: Uint8Array): Buffer;
  from(str: string, encoding?: string): Buffer;
  from(object: { valueOf(): string | object } | { [Symbol.toPrimitive](hint: 'string'): string }, encoding?: string): Buffer;
};

declare module '@huggingface/inference' {
  export class HfInference {
    constructor(accessToken?: string);
    
    textGeneration(options: {
      model: string;
      inputs: string;
      parameters?: {
        max_new_tokens?: number;
        temperature?: number;
        top_p?: number;
        repetition_penalty?: number;
        max_time?: number;
        top_k?: number;
        truncate?: number;
        stop?: string[];
        return_full_text?: boolean;
        do_sample?: boolean;
      }
    }): Promise<{
      generated_text: string;
    }>;
    
    request(options: {
      model: string;
      data: any;
    }): Promise<any>;
  }
} 