/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-27
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description:
 */
/**
 * PlaywrightMCP - Playwright测试自动化MCP服务器
 *
 * 这个服务器提供基于Model Context Protocol (MCP)的Playwright测试自动化功能，允许：
 * - 从Git仓库或本地路径获取项目代码
 * - 使用Playwright设置测试环境
 * - 从需求文本或文档生成测试用例
 * - 执行UI和API测试并生成报告
 * - 捕获并分析网络请求和控制台日志
 *
 * @module PlaywrightMCP
 */

import { createPlaywrightMCPServer } from './mcp/server';

// 导出服务
export * from './services';

// 导出类型定义
export * as CoreTypes from './types/core';
export * as MCPTypes from './types/mcp';

/**
 * 创建MCP服务器实例
 * @param options 服务器配置选项
 * @returns MCP服务器实例
 */
export function createMCPServer(options: { port?: number; transport?: "http" } = {}) {
  return createPlaywrightMCPServer(options);
}

// 导出默认创建函数
export default createMCPServer;
