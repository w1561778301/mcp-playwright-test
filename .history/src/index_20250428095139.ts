/**
 * PlaywrightMCP - Playwright测试自动化MCP服务器
 */

// 导出类型命名空间
import * as CoreTypes from "./types";
import * as MCPTypes from "./mcp/types";
import * as Services from "./services";

// 导出MCP服务器工厂函数
export { createMcpServer } from "./mcp/server/index";

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
