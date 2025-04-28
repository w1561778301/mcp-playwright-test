/**
 * Playwright MCP Server Implementation
 *
 * This module provides a full MCP server implementation that integrates with
 * the Playwright MCP Test SDK to provide intelligent test automation capabilities.
 */

import * as http from "http";
import * as path from "path";
import * as fs from "fs";

// Define Express and WebSocket types
type Express = any;
type Request = any;
type Response = any;
type NextFunction = any;
type WebSocket = any;

// Import MCP types
import { MCPTransport, MCPServerOptions, MCPToolDefinition, MCPTool, MCPResource } from "./types";
import { createToolManager } from "./tools";
import { createResourceManager } from "./resources";

// Define PlaywrightMCPTestSDK since we can't import it directly yet
class PlaywrightMCPTestSDK {
  configure(options: any): any {
    return this;
  }
  async setupMCPServer(): Promise<void> {}
  async launchBrowser(options?: any): Promise<void> {}
  async close(): Promise<void> {}
  async cloneRepository(url: string, credentials?: any): Promise<void> {}
  async useLocalProject(path: string): Promise<void> {}
  async generateTestsFromRequirements(text: string): Promise<any[]> {
    return [];
  }
  async generateTestsFromDocument(path: string): Promise<any[]> {
    return [];
  }
  async runTests(testCases: any[]): Promise<any> {
    return {};
  }
  async captureNetworkRequests(): Promise<any[]> {
    return [];
  }
  async captureConsoleMessages(): Promise<any[]> {
    return [];
  }
  async generateErrorReport(): Promise<any> {
    return {};
  }
  mockAPIEndpoint?(endpoint: string, method: string, response: any): void {}
  getBrowser?(): any {
    return null;
  }
  getPage?(): any {
    return null;
  }
}

// Mock Express for development - you should install express and ws packages
const express = {
  json: () => (req: Request, res: Response, next: NextFunction) => next(),
  urlencoded: () => (req: Request, res: Response, next: NextFunction) => next(),
  static: (path: string) => (req: Request, res: Response, next: NextFunction) => next(),
};

/**
 * Main MCP Server class that manages the MCP functionality
 */
export class MCPServer {
  private server: http.Server;
  private app: Express;
  private wsServer: WebSocket.Server | null = null;
  private sdk: PlaywrightMCPTestSDK;
  private options: MCPServerOptions;
  private toolManager: ReturnType<typeof createToolManager>;
  private resourceManager: ReturnType<typeof createResourceManager>;
  private isRunning = false;
  private sessions: Map<string, any> = new Map();

  /**
   * Create a new MCP Server instance
   * @param options Server configuration options
   */
  constructor(options: MCPServerOptions) {
    this.options = {
      port: 8931,
      enableCors: true,
      enableLogging: true,
      sdkOptions: {},
      ...options,
    };

    // Initialize Express app
    this.app = express();

    // Configure Express middleware
    if (this.options.enableCors) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        if (req.method === "OPTIONS") {
          return res.sendStatus(200);
        }
        next();
      });
    }

    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    if (this.options.enableLogging) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Initialize SDK
    this.sdk = new PlaywrightMCPTestSDK();
    this.sdk.configure(this.options.sdkOptions);

    // Initialize managers
    this.toolManager = createToolManager(this.sdk);
    this.resourceManager = createResourceManager(this.sdk);

    // Set up routes and tools
    this.setupRoutes();
    this.registerTools();
    this.registerResources();
  }

  /**
   * Set up HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok", version: "1.0.0" });
    });

    // MCP API endpoint
    this.app.post("/api/mcp", async (req: Request, res: Response) => {
      try {
        const { action, params, sessionId } = req.body;

        if (!sessionId) {
          return res.status(400).json({ error: "Session ID is required" });
        }

        // Create session if it doesn't exist
        if (!this.sessions.has(sessionId)) {
          this.sessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            context: {},
          });
        }

        const session = this.sessions.get(sessionId);

        switch (action) {
          case "listTools":
            res.json({ tools: this.toolManager.listTools() });
            break;

          case "executeTool":
            if (!params || !params.toolName) {
              return res.status(400).json({ error: "Tool name is required" });
            }

            try {
              const result = await this.toolManager.executeTool(params.toolName, params.parameters || {}, session);
              res.json({ result });
            } catch (error) {
              res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
                details: error,
              });
            }
            break;

          case "listResources":
            res.json({ resources: this.resourceManager.listResources() });
            break;

          case "getResource":
            if (!params || !params.resourceId) {
              return res.status(400).json({ error: "Resource ID is required" });
            }

            try {
              const resource = await this.resourceManager.getResource(params.resourceId, params.parameters || {});
              res.json({ resource });
            } catch (error) {
              res.status(500).json({
                error: error instanceof Error ? error.message : "Unknown error",
                details: error,
              });
            }
            break;

          default:
            res.status(400).json({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        console.error("Error handling API request:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error",
        });
      }
    });

    // Static files (if needed)
    if (this.options.staticPath) {
      this.app.use(express.static(this.options.staticPath));
    }
  }

  /**
   * Set up WebSocket server for real-time communication
   */
  private setupWebSocketServer(): void {
    // Mock implementation until proper WebSocket library is installed
    this.wsServer = {
      on: (event: string, callback: Function) => {},
      close: () => {},
    } as any;

    console.log("WebSocket server setup is mocked. Install ws package for actual implementation.");
  }

  /**
   * Register all available tools
   */
  private registerTools(): void {
    // Register all available tools from the tool manager
    this.toolManager.registerCoreTools();

    // Register additional tools if provided in options
    if (this.options.additionalTools) {
      for (const tool of this.options.additionalTools) {
        this.toolManager.registerTool(tool);
      }
    }
  }

  /**
   * Register all available resources
   */
  private registerResources(): void {
    // Register all available resources from the resource manager
    this.resourceManager.registerCoreResources();

    // Register additional resources if provided in options
    if (this.options.additionalResources) {
      for (const resource of this.options.additionalResources) {
        this.resourceManager.registerResource(resource);
      }
    }
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("MCP Server is already running");
      return;
    }

    // Set up WebSocket server if transport includes 'ws'
    if (this.options.transport?.includes("ws")) {
      this.setupWebSocketServer();
    }

    // Start HTTP server
    return new Promise((resolve) => {
      this.server.listen(this.options.port, () => {
        this.isRunning = true;
        console.log(`MCP Server running on port ${this.options.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn("MCP Server is not running");
      return;
    }

    // Close WebSocket server if it exists
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    // Close all sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.ws) {
        session.ws.close();
      }
      this.sessions.delete(sessionId);
    }

    // Stop the HTTP server
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.isRunning = false;
        console.log("MCP Server stopped");
        resolve();
      });
    });
  }

  /**
   * Get the underlying SDK instance
   */
  public getSDK(): PlaywrightMCPTestSDK {
    return this.sdk;
  }

  /**
   * Get the underlying HTTP server
   */
  public getHttpServer(): http.Server {
    return this.server;
  }

  /**
   * Get the express app
   */
  public getExpressApp(): Express {
    return this.app;
  }
}

/**
 * Create and initialize a new MCP server
 * @param options Server configuration options
 * @returns A new MCPServer instance
 */
export function createMCPServer(options: MCPServerOptions = {}): MCPServer {
  return new MCPServer(options);
}
