/**
 * Streamable HTTP Transport for MCP Server
 * @file src/mcp/transports/streamable-http.ts
 * @version 1.0.0
 * @description Implements the Streamable HTTP transport for the Model Context Protocol (MCP) server using the official SDK
 */

import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 为了类型兼容，定义一个包含服务器信息属性的接口
interface ServerMetadata {
  name?: string;
  version?: string;
  description?: string;
}

/**
 * HTTP传输配置选项
 */
export interface HTTPTransportOptions {
  /**
   * 端口号，默认3000
   */
  port?: number;

  /**
   * 是否启用有状态模式，默认true
   * - true: 使用会话管理（支持服务器到客户端的通知）
   * - false: 无状态模式（为每个请求创建新的传输实例）
   */
  stateful?: boolean;

  /**
   * 是否启用CORS，默认true
   */
  enableCors?: boolean;

  /**
   * 日志级别，默认'info'
   */
  logLevel?: "none" | "error" | "warn" | "info" | "debug";

  /**
   * 服务器元数据，如果McpServer实例未提供这些信息
   */
  serverMetadata?: ServerMetadata;
}

/**
 * 创建并配置HTTP传输
 * @param server MCP服务器实例
 * @param options 传输配置选项
 */
export function createHTTPTransport(server: McpServer, options: HTTPTransportOptions = {}) {
  const {
    port = 3000,
    stateful = true,
    enableCors = true,
    logLevel = "info",
    serverMetadata = {
      name: "playwright-mcp",
      version: "0.1.0",
      description: "MCP Server for Playwright Testing",
    },
  } = options;

  const app = express();

  // 配置中间件
  if (enableCors) {
    app.use(cors());
  }
  app.use(express.json({ limit: "50mb" }));
  app.use(bodyParser.json({ limit: "50mb" }));

  // 日志中间件
  if (logLevel !== "none") {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        if (logLevel === "debug") {
          console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        } else if (logLevel === "info" && (res.statusCode >= 400 || duration > 1000)) {
          console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        } else if (logLevel === "warn" && res.statusCode >= 400) {
          console.warn(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        } else if (logLevel === "error" && res.statusCode >= 500) {
          console.error(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
      });
      next();
    });
  }

  // 错误处理中间件
  app.use((err: Error, req: Request, res: Response, _next: any) => {
    console.error("HTTP传输错误:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: err.message || "内部服务器错误",
        },
        id: null,
      });
    }
  });

  // 健康检查端点
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // 服务器版本和信息端点
  app.get("/server-info", (_req, res) => {
    // 将server作为any类型处理，以访问可能存在的metadata属性
    const serverAny = server as any;

    res.status(200).json({
      // 尝试访问server的属性，如果不存在则使用默认值
      name: serverAny.name || serverMetadata.name,
      version: serverAny.version || serverMetadata.version,
      description: serverAny.description || serverMetadata.description,
    });
  });

  if (stateful) {
    // === 有状态模式：使用会话管理 ===
    setupStatefulMode(app, server);
  } else {
    // === 无状态模式：为每个请求创建新的传输实例 ===
    setupStatelessMode(app, server);
  }

  // 启动HTTP服务器
  const httpServer = app.listen(port, () => {
    console.log(`HTTP传输在端口 ${port} 上启动`);
  });

  // 关闭服务器的方法
  const closeServer = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      httpServer.close((err?: Error) => {
        if (err) {
          console.error("关闭HTTP服务器时出错:", err);
          reject(err);
        } else {
          console.log("HTTP传输已断开连接");
          resolve();
        }
      });
    });
  };

  return { closeServer };
}

/**
 * 设置有状态模式（使用会话管理）
 */
function setupStatefulMode(app: express.Application, server: McpServer) {
  // 存储传输实例的映射表
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // 处理POST请求
  app.post("/mcp", async (req, res) => {
    // 检查现有会话ID
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // 复用现有传输
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // 新的初始化请求
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          // 按会话ID存储传输
          transports[sid] = transport;
        },
      });

      // 传输关闭时清理
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      // 连接到MCP服务器
      await server.connect(transport);
    } else {
      // 无效请求
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "错误请求：未提供有效的会话ID",
        },
        id: null,
      });
      return;
    }

    // 处理请求
    await transport.handleRequest(req, res, req.body);
  });

  // 处理GET和DELETE请求的可重用处理程序
  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "无效或缺少会话ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  // 处理GET请求（用于服务器到客户端的通知，通过SSE）
  app.get("/mcp", handleSessionRequest);

  // 处理DELETE请求（用于会话终止）
  app.delete("/mcp", handleSessionRequest);

  console.log("已配置有状态模式 (支持会话管理)");
}

/**
 * 设置无状态模式（为每个请求创建新的传输实例）
 */
function setupStatelessMode(app: express.Application, server: McpServer) {
  app.post("/mcp", async (req: Request, res: Response) => {
    // 在无状态模式下，为每个请求创建新的传输和服务器实例
    // 以确保完全隔离。单个实例在多个客户端并发连接时会导致请求ID冲突。
    try {
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // 禁用会话管理
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        console.log("请求已关闭");
        transport.close();
      });
    } catch (error) {
      console.error("处理MCP请求时出错:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "内部服务器错误",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (_req: Request, res: Response) => {
    console.log("收到GET MCP请求");
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "方法不允许。",
        },
        id: null,
      })
    );
  });

  app.delete("/mcp", async (_req: Request, res: Response) => {
    console.log("收到DELETE MCP请求");
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "方法不允许。",
        },
        id: null,
      })
    );
  });

  console.log("已配置无状态模式 (每个请求创建新的传输实例)");
}
