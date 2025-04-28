/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: Type definitions for Model Context Protocol SDK
 */

/**
 * Model Context Protocol SDK 类型声明
 */
declare module "@modelcontextprotocol/sdk" {
  export interface ServerOptions {
    port?: number;
    name?: string;
    description?: string;
    version?: string;
  }

  export interface TransportOptions {
    format?: 'json' | 'binary';
    maxPayloadSize?: number;
  }

  export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        items?: any;
        enum?: string[];
      }>;
      required?: string[];
    };
  }

  export interface ResourceDefinition {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        items?: any;
        enum?: string[];
      }>;
      required?: string[];
    };
  }

  export interface Tool {
    definition: ToolDefinition;
    handler: (params: any) => Promise<any>;
  }

  export interface Resource {
    definition: ResourceDefinition;
    handler: (params: any) => Promise<any>;
  }

  export class BaseServer {
    constructor(options?: ServerOptions);
    registerTool(tool: Tool): void;
    registerResource(resource: Resource): void;
    start(): Promise<void>;
    stop(): Promise<void>;
  }

  export class Server extends BaseServer {
    constructor(options?: ServerOptions);
    addTransport(transport: any): void;
    getTools(): Tool[];
    getResources(): Resource[];
  }

  export class HTTPTransport {
    constructor(options?: TransportOptions);
    connect(server: Server): void;
  }

  export const z: {
    string: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    boolean: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    number: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    enum: (values: string[]) => {
      describe: (description: string) => any;
      optional: () => any;
    };
    object: (schema: any) => {
      describe: (description: string) => any;
      optional: () => any;
    };
    array: (schema: any) => {
      describe: (description: string) => any;
      optional: () => any;
    };
  };

  export function createTool(definition: ToolDefinition, handler: (params: any) => Promise<any>): Tool;
  export function createResource(definition: ResourceDefinition, handler: (params: any) => Promise<any>): Resource;
}
