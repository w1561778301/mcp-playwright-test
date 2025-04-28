/**
 * PlaywrightMCP - Playwright测试自动化MCP服务器
 */

// Export server
export * from "./mcp/server";

// Export types
export * from "./types/core";
export * from "./types/mcp";

// Export services
export * from "./services";

// Export default function
import { createMCPServer } from "./mcp/server";
export default createMCPServer;
