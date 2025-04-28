/**
 * HTTP transport for the MCP server
 *
 * This implements the Model Context Protocol over HTTP
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import { MCPSession, ToolManager, ResourceManager } from "../types";

/**
 * HTTP Transport for the MCP Server
 */
export class HttpTransport {
  private app: express.Application;
  private port: number;
  private sessions: Map<string, MCPSession> = new Map();
  private toolManager: ToolManager;
  private resourceManager: ResourceManager;

  /**
   * Create a new HTTP transport
   *
   * @param toolManager - The tool manager
   * @param resourceManager - The resource manager
   * @param port - The port to listen on (default: 3000)
   */
  constructor(toolManager: ToolManager, resourceManager: ResourceManager, port: number = 3000) {
    this.app = express();
    this.port = port;
    this.toolManager = toolManager;
    this.resourceManager = resourceManager;

    // Configure middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());

    // Configure error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled error", err);
      res.status(500).json({
        success: false,
        error: {
          message: "Internal server error",
          details: err.message,
        },
      });
    });

    this.setupRoutes();
  }

  /**
   * Setup routes for the HTTP transport
   */
  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok" });
    });

    // Get server info
    this.app.get("/server-info", (req: Request, res: Response) => {
      try {
        res.json({
          success: true,
          data: {
            name: "Playwright MCP Server",
            version: "1.0.0",
            tools: this.toolManager.listTools(),
            resources: this.resourceManager.listResources(),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to get server info",
            details: err.message,
          },
        });
      }
    });

    // Create a new session
    this.app.post("/sessions", (req: Request, res: Response) => {
      try {
        const sessionId = uuidv4();
        const session: MCPSession = {
          id: sessionId,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          data: {},
        };
        this.sessions.set(sessionId, session);

        res.json({
          success: true,
          data: {
            session_id: sessionId,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to create session",
            details: err.message,
          },
        });
      }
    });

    // Get session info
    this.app.get("/sessions/:sessionId", (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = this.sessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            success: false,
            error: {
              message: "Session not found",
              details: `No session with ID ${sessionId}`,
            },
          });
        }

        res.json({
          success: true,
          data: {
            session_id: session.id,
            created_at: session.createdAt,
            last_accessed_at: session.lastAccessedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: {
            message: "Failed to get session info",
            details: err.message,
          },
        });
      }
    });

    // Execute a tool
    this.app.post("/tools/:toolName", async (req: Request, res: Response) => {
      try {
        const { toolName } = req.params;
        const { parameters, session_id } = req.body;

        // Validate request
        if (!toolName) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Tool name is required",
              details: "Please provide a tool name in the URL",
            },
          });
        }

        if (!session_id) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Session ID is required",
              details: "Please provide a session_id in the request body",
            },
          });
        }

        // Get session
        const session = this.sessions.get(session_id);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: {
              message: "Session not found",
              details: `No session with ID ${session_id}`,
            },
          });
        }

        // Update last accessed time
        session.lastAccessedAt = new Date();

        // Execute tool
        const result = await this.toolManager.executeTool(toolName, parameters || {}, session);

        res.json({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: {
            message: `Failed to execute tool: ${err.message}`,
            details: err.message,
          },
        });
      }
    });

    // Get a resource
    this.app.get("/resources/:resourceId", async (req: Request, res: Response) => {
      try {
        const { resourceId } = req.params;
        const parameters = req.query as Record<string, any>;

        if (!resourceId) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Resource ID is required",
              details: "Please provide a resource ID in the URL",
            },
          });
        }

        const result = await this.resourceManager.getResource(resourceId, parameters);

        res.json({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
          success: false,
          error: {
            message: `Failed to get resource: ${err.message}`,
            details: err.message,
          },
        });
      }
    });
  }

  /**
   * Start the HTTP server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`MCP HTTP server listening on port ${this.port}`);
    });
  }

  /**
   * Stop the HTTP server
   */
  public stop(): void {
    // Implementation to stop the server
    console.log("Stopping MCP HTTP server");
  }
}
