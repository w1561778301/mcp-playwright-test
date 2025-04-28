/**
 * PlaywrightMCP - Playwright测试自动化MCP服务器
 */

// 导出服务器功能
export * from './mcp/server';

// 导出类型定义
export * from './types/core';
export * from './types/mcp';

// 导出服务
export * from './services/git-service';
export * from './services/playwright-service';
export * from './services/test-generator-service';
export * from './services/test-execution-service';
export * from './services/api-testing-service';

// 导出默认函数
import { createMCPServer } from './mcp/server';
export default createMCPServer;
