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
  export class Server {
    constructor(info: { name: string; version: string }, options?: { capabilities?: { tools?: Record<string, any> } });

    registerTool(tool: Tool): void;
    registerResource(resource: Resource): void;

    connect(transport: any): Promise<void>;

    onerror: (error: Error) => void;
  }

  export class BaseServer {
    constructor(info: { name: string; version: string });
    connect(transport: any): Promise<void>;
  }

  export function createServer(options: { name: string; version: string }): BaseServer;

  export class HttpTransport {
    constructor(options: { port: number });
  }

  export interface ServerTransport {
    connect(): Promise<void>;
  }

  export interface Tool {
    name: string;
    parameters: Record<string, any>;
    handler: (params: Record<string, any>) => Promise<any>;
  }

  export interface Resource {
    name: string;
    template: any;
    handler: (uri: URL, params: Record<string, any>) => Promise<any>;
  }

  export class ToolDefinition {
    constructor(name: string, parameters: Record<string, any>, handler: (params: Record<string, any>) => Promise<any>);
  }

  export class ResourceDefinition {
    constructor(name: string, template: any, handler: (uri: URL, params: Record<string, any>) => Promise<any>);
  }

  export const z: {
    string(): {
      url(): any;
      optional(): any;
    };
    boolean(): { optional(): any };
    number(): { optional(): any };
    enum(values: string[]): { optional(): any };
    object(schema: Record<string, any>): { optional(): any };
    array(schema: any): { optional(): any };
    any(): any;
  };
}
