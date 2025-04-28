/**
 * HTTP Transport for MCP Server
 *
 * This module provides HTTP transport capability for the MCP server.
 */

import { Request, Response, Application } from "express";
import { MCPSession, MCPResponse } from "../types";

/**
 * HTTP Transport options
 */
export interface HttpTransportOptions {
  /**
   * Base path for HTTP endpoints
   * @default '/api/mcp'
   */
  basePath?: string;

  /**
   * Enable CORS for all requests
   * @default true
   */
  enableCors?: boolean;
}

/**
 * Creates an HTTP transport for the MCP server
 * @param app Express application
 * @param options HTTP transport options
 */
export function createHttpTransport(app: Application, options: HttpTransportOptions = {}) {
  const basePath = options.basePath || "/api/mcp";
  const enableCors = options.enableCors !== false; // 默认启用CORS

  /**
   * Set up HTTP routes for the MCP server
   * @param toolManager Tool manager instance
   * @param resourceManager Resource manager instance
   * @param sessions Session map
   */
  function setupRoutes(toolManager: any, resourceManager: any, sessions: Map<string, MCPSession>): void {
    // 如果启用CORS，为所有路由添加CORS头
    if (enableCors) {
      app.use(`${basePath}/*`, (req: Request, res: Response, next: Function) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        if (req.method === "OPTIONS") {
          return res.sendStatus(200);
        }
        next();
      });
    }

    // Health check endpoint
    app.get(`${basePath}/health`, (req: Request, res: Response) => {
      res.json({ status: "ok", version: "1.0.0" });
    });

    // List available tools
    app.get(`${basePath}/tools`, (req: Request, res: Response) => {
      res.json({ tools: toolManager.listTools() });
    });

    // Execute a tool
    app.post(`${basePath}/tools/execute`, async (req: Request, res: Response) => {
      try {
        const { toolName, parameters, sessionId } = req.body;

        if (!toolName) {
          return res.status(400).json({
            error: "Tool name is required",
            code: "TOOL_NAME_REQUIRED",
          });
        }

        if (!sessionId) {
          return res.status(400).json({
            error: "Session ID is required",
            code: "SESSION_ID_REQUIRED",
          });
        }

        // Create session if it doesn't exist
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            context: {},
          });
        }

        const session = sessions.get(sessionId)!;

        try {
          const result = await toolManager.executeTool(toolName, parameters || {}, session);

          const response: MCPResponse = {
            result,
          };

          res.json(response);
        } catch (error: any) {
          console.error(`Error executing tool '${toolName}':`, error);

          res.status(500).json({
            error: error.message || "Unknown error",
            details: error,
            code: "TOOL_EXECUTION_ERROR",
          });
        }
      } catch (error: any) {
        console.error("Error handling tool execution request:", error);

        res.status(500).json({
          error: error.message || "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    });

    // List available resources
    app.get(`${basePath}/resources`, (req: Request, res: Response) => {
      res.json({ resources: resourceManager.listResources() });
    });

    // Get a resource
    app.post(`${basePath}/resources/get`, async (req: Request, res: Response) => {
      try {
        const { resourceId, parameters, sessionId } = req.body;

        if (!resourceId) {
          return res.status(400).json({
            error: "Resource ID is required",
            code: "RESOURCE_ID_REQUIRED",
          });
        }

        if (!sessionId) {
          return res.status(400).json({
            error: "Session ID is required",
            code: "SESSION_ID_REQUIRED",
          });
        }

        // Create session if it doesn't exist
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            context: {},
          });
        }

        try {
          const resource = await resourceManager.getResource(resourceId, parameters || {});

          const response: MCPResponse = {
            result: resource,
          };

          res.json(response);
        } catch (error: any) {
          console.error(`Error retrieving resource '${resourceId}':`, error);

          res.status(500).json({
            error: error.message || "Unknown error",
            details: error,
            code: "RESOURCE_RETRIEVAL_ERROR",
          });
        }
      } catch (error: any) {
        console.error("Error handling resource retrieval request:", error);

        res.status(500).json({
          error: error.message || "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    });

    // Session management
    app.post(`${basePath}/sessions/create`, (req: Request, res: Response) => {
      const sessionId = req.body.sessionId || generateSessionId();

      if (sessions.has(sessionId)) {
        return res.status(400).json({
          error: "Session already exists",
          code: "SESSION_EXISTS",
        });
      }

      sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date(),
        context: req.body.context || {},
      });

      res.json({
        result: {
          sessionId,
          createdAt: sessions.get(sessionId)!.createdAt,
        },
      });
    });

    app.post(`${basePath}/sessions/destroy`, (req: Request, res: Response) => {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: "Session ID is required",
          code: "SESSION_ID_REQUIRED",
        });
      }

      if (!sessions.has(sessionId)) {
        return res.status(404).json({
          error: "Session not found",
          code: "SESSION_NOT_FOUND",
        });
      }

      sessions.delete(sessionId);

      res.json({
        result: {
          success: true,
        },
      });
    });
  }

  /**
   * Generate a random session ID
   */
  function generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  return {
    setupRoutes,
  };
}
