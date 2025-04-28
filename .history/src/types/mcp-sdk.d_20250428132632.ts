/**
 * 为Model Context Protocol SDK提供类型声明
 */
declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(
      info: { name: string; version: string },
      options?: { capabilities?: { tools?: Record<string, any> } }
    );
    registerTool(tool: Tool): void;
    registerResource(resource: Resource): void;
    connect(transport: ServerTransport): void;
    start(): Promise<void>;
    onerror: (error: any) => void;
  }

  export class BaseServer {
    registerTool(tool: Tool): void;
    registerResource(resource: Resource): void;
    connect(transport: ServerTransport): void;
    start(): Promise<void>;
    onerror: (error: any) => void;
  }

  export interface ServerTransport {
    port?: number;
  }

  export class HttpTransport implements ServerTransport {
    constructor(options?: { port?: number });
  }

  export interface Tool {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
    execute: (params: any) => Promise<any>;
  }

  export interface Resource {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
    retrieve: (params: any) => Promise<any>;
  }

  export const z: {
    object: (schema: Record<string, any>) => any;
    string: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    number: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    boolean: () => {
      describe: (description: string) => any;
      optional: () => any;
    };
    enum: (values: readonly string[]) => {
      describe: (description: string) => any;
      optional: () => any;
    };
    array: (schema: any) => {
      describe: (description: string) => any;
      optional: () => any;
    };
  };

  export function createServer(options?: any): BaseServer;

  export interface ToolDefinition {
    name: string;
    description: string;
    parameters: any;
    handler: (params: any) => Promise<any>;
  }

  export interface ResourceDefinition {
    name: string;
    description: string;
    parameters: any;
    handler: (params: any) => Promise<any>;
  }
}
