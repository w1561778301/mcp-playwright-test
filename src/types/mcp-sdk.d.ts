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
  import { ZodType, ZodObject } from "zod";

  export interface ServerOptions {
    name: string;
    version: string;
    description?: string;
  }

  export interface ToolOptions {
    name: string;
    description?: string;
  }

  export interface ResourceOptions {
    name: string;
    description?: string;
  }

  export interface ServerTransportOptions {
    port?: number;
    baseUrl?: string;
    format?: "json" | "binary";
  }

  // Re-export Zod for schema validation
  export const z: typeof import("zod").z;

  // Server class
  export class Server {
    constructor(options: ServerOptions, capabilities?: Record<string, any>);
    registerTool(tool: any): void;
    registerResource(resource: any): void;
    addTransport(transport: any): void;
    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
  }

  // McpServer class - higher level API
  export class McpServer {
    constructor(options: ServerOptions);
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    tool(name: string, paramSchema: Record<string, any>, handler: (params: any) => Promise<any>): any;
    resource(name: string, template: string | ResourceTemplate, handler: (uri: URL, params: any) => Promise<any>): any;
    prompt(name: string, paramSchema: Record<string, any>, handler: (params: any) => any): any;
  }

  // Transport classes
  export class HTTPTransport {
    constructor(options?: ServerTransportOptions);
  }

  export class StdioServerTransport {
    constructor();
  }

  export class StreamableHTTPServerTransport {
    constructor(options?: any);
    handleRequest(req: any, res: any, body?: any): Promise<void>;
    sessionId?: string;
    onclose?: () => void;
  }

  // Templates
  export class ResourceTemplate {
    constructor(template: string, options?: any);
  }

  // Tool creation
  export function createTool(definition: any, handler: (params: any) => Promise<any>): any;

  // Resource creation
  export function createResource(definition: any, handler: (params: any) => Promise<any>): any;
}
