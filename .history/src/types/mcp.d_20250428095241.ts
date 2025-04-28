declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(options: { name: string; version: string });

    resource(
      name: string,
      template: ResourceTemplate,
      handler: (uri: URL, params: Record<string, any>) => Promise<any>
    ): void;

    tool(
      name: string,
      parameters: Record<string, any>,
      handler: (params: Record<string, any>) => Promise<any>
    ): void;

    prompt(
      name: string,
      parameters: Record<string, any>,
      handler: (params: Record<string, any>) => any
    ): void;

    connect(transport: any): Promise<void>;
  }

  export class ResourceTemplate {
    constructor(template: string, options: { list: undefined });
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "@modelcontextprotocol/sdk/server/streamableHttp.js" {
  export class StreamableHTTPServerTransport {
    constructor(options: {
      sessionIdGenerator: () => string;
      onsessioninitialized: (sessionId: string) => void;
    });

    onclose: () => void;
    sessionId?: string;
    handleRequest(req: any, res: any, body?: any): Promise<void>;
  }
}

declare module "zod" {
  export const z: {
    string(): {
      url(): any;
      optional(): any;
    };
    boolean(): { optional(): any; };
    number(): { optional(): any; };
    enum(values: string[]): { optional(): any; };
    object(schema: Record<string, any>): { optional(): any; };
    any(): any;
  };
}
