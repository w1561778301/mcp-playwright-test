/**
 * PlaywrightMCP - Playwright测试自动化MCP服务器
 */

import * as MCPServer from "./mcp/server";
import { CoreTypes } from "./types/core";
import { MCPTypes } from "./types/mcp";
import { Services } from "./services";

// Export MCP server
export * from "./mcp/server";

// Export services
export * from "./services/git-service";
export * from "./services/playwright-service";
export * from "./services/test-generator-service";
export * from "./services/test-execution-service";

// Export types
export * from "./types";

// 导出服务
export {
  GitService,
  PlaywrightService,
  TestGeneratorService,
  TestExecutionService,
  ApiTestingService,
} from "./services";

// 命名空间导出避免冲突
export { CoreTypes, MCPTypes, Services };

// 从服务中导出常用类型，便于使用
export type {
  BrowserOptions,
  NetworkRequest,
  NetworkResponse,
  ConsoleMessageData,
} from "./services/playwright-service";

export type { GitCredentials, GitRepositoryOptions } from "./services/git-service";

export type { TestCase, TestStep, TestSuite, TestType } from "./services/test-generator-service";

export type {
  TestCaseResult,
  TestResults,
  ErrorReport,
  FrontendError,
  BackendError,
} from "./services/test-execution-service";

export type {
  ApiEndpoint,
  ApiSpec,
  ApiTestCaseResult,
  ApiTestResult,
  ApiDocFormat,
} from "./services/api-testing-service";

// Re-export everything
export { MCPServer, CoreTypes, MCPTypes, Services };

// Main export function
export default MCPServer.createMcpServer;
