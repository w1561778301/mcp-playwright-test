/**
 * [DEPRECATED] HTTP Transport for MCP Server
 * @file src/mcp/transports/http.ts
 * @version 1.0.0
 * @description 弃用的HTTP传输实现，请使用streamable-http.ts中的实现
 * @deprecated 请使用streamable-http.ts中的createHTTPTransport函数，它使用SDK提供的StreamableHTTPServerTransport
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import { McpServer } from "@modelcontextprotocol/sdk";
import { MCPSession } from "../types";

/**
 * [DEPRECATED] HTTP Transport implementation for MCP Server
 * @deprecated 此实现已弃用，请使用streamable-http.ts中的实现
 */
export class HTTPTransport {
  private app: express.Application;
  private server: any;
  private port: number;
  private mcpServer: McpServer;
  private sessions: Map<string, MCPSession> = new Map();

  /**
   * Initialize HTTP transport
   * @param mcpServer MCP Server instance
   * @param port Port to listen on (default: 3000)
   * @deprecated 此实现已弃用，请使用streamable-http.ts中的实现
   */
  constructor(mcpServer: McpServer, port: number = 3000) {
    console.warn("[DEPRECATED] HTTPTransport被弃用，请使用streamable-http.ts中的createHTTPTransport");
    this.mcpServer = mcpServer;
    this.port = port;
    this.app = express();

    // Configure middleware
    this.app.use(cors());
    this.app.use(bodyParser.json({ limit: "50mb" }));
    this.app.use(this.errorHandler.bind(this));

    // Setup routes
    this.setupRoutes();
  }

  /**
   * Error handling middleware
   */
  private errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    console.error("HTTP Transport Error:", err);
    res.status(500).json({
      success: false,
      error: {
        message: err.message || "Internal Server Error",
        name: err.name || "Error",
      },
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes() {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    // Server info endpoint
    this.app.get("/server-info", async (req, res) => {
      try {
        const info = await this.mcpServer.getServerInfo();
        res.status(200).json(info);
      } catch (error) {
        console.error("Error getting server info:", error);
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            name: error instanceof Error ? error.name : "Error",
          },
        });
      }
    });

    // Create session endpoint
    this.app.post("/sessions", (req, res) => {
      try {
        const sessionId = uuidv4();
        const session: MCPSession = {
          id: sessionId,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          data: {},
        };

        this.sessions.set(sessionId, session);

        res.status(201).json({
          success: true,
          session: {
            id: session.id,
            createdAt: session.createdAt,
          },
        });
      } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            name: error instanceof Error ? error.name : "Error",
          },
        });
      }
    });

    // Get session info endpoint
    this.app.get("/sessions/:sessionId", (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.sessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            success: false,
            error: {
              message: "Session not found",
              name: "NotFoundError",
            },
          });
        }

        session.lastAccessedAt = new Date();

        res.status(200).json({
          success: true,
          session: {
            id: session.id,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
          },
        });
      } catch (error) {
        console.error("Error getting session:", error);
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            name: error instanceof Error ? error.name : "Error",
          },
        });
      }
    });

    // Execute tool endpoint
    this.app.post("/sessions/:sessionId/tools/:toolId", async (req, res) => {
      try {
        const { sessionId, toolId } = req.params;
        const parameters = req.body;

        const session = this.sessions.get(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: {
              message: "Session not found",
              name: "NotFoundError",
            },
          });
        }

        session.lastAccessedAt = new Date();

        const result = await this.mcpServer.executeTool(toolId, parameters);
        res.status(200).json(result);
      } catch (error) {
        console.error(`Error executing tool ${req.params.toolId}:`, error);
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            name: error instanceof Error ? error.name : "Error",
          },
        });
      }
    });

    // Get resource endpoint
    this.app.get("/sessions/:sessionId/resources/:resourceId", async (req, res) => {
      try {
        const { sessionId, resourceId } = req.params;
        const parameters = req.query;

        const session = this.sessions.get(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: {
              message: "Session not found",
              name: "NotFoundError",
            },
          });
        }

        session.lastAccessedAt = new Date();

        const result = await this.mcpServer.getResource(resourceId, parameters);
        res.status(200).json(result);
      } catch (error) {
        console.error(`Error getting resource ${req.params.resourceId}:`, error);
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            name: error instanceof Error ? error.name : "Error",
          },
        });
      }
    });
  }

  /**
   * Connect to HTTP transport
   */
  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`HTTP Transport listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Disconnect from HTTP transport
   */
  async disconnect(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server.close((err: Error) => {
          if (err) {
            console.error("Error closing HTTP server:", err);
            reject(err);
          } else {
            console.log("HTTP Transport disconnected");
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  }
}
