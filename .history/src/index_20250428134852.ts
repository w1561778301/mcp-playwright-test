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

import { McpServer, HTTPTransport, z } from "@modelcontextprotocol/sdk";
import * as path from "path";
import * as GitService from "./services/git-service";
import * as PlaywrightService from "./services/playwright-service";
import * as TestGeneratorService from "./services/test-generator-service";
import * as TestExecutionService from "./services/test-execution-service";
import * as ApiTestingService from "./services/api-testing-service";
import {
  GitOptions,
  LocalProjectOptions,
  BrowserOptions,
  TestGenerationOptions,
  TestExecutionOptions,
  ApiTestOptions,
} from "./types/core";

/**
 * 创建一个MCP服务器实例，用于Playwright测试自动化
 *
 * @param options 服务器配置选项
 * @returns MCP服务器实例
 */
export function createMCPServer(options: { port?: number; transport?: "http" } = {}) {
  const port = options.port || 8931;

  // 初始化服务器
  const server = new McpServer({
    name: "playwright-mcp",
    version: "0.1.0",
    description: "Playwright测试自动化MCP服务器",
  });

  // 初始化服务
  const gitService = new GitService.GitService();
  const playwrightService = new PlaywrightService.PlaywrightService();
  const testGenerator = new TestGeneratorService.TestGeneratorService();
  const testExecution = new TestExecutionService.TestExecutionService(playwrightService);
  const apiTesting = new ApiTestingService.ApiTestingService();

  // 克隆Git仓库工具
  server.tool(
    "clone-repository",
    {
      url: z.string().describe("Git仓库URL"),
      branch: z.string().optional().describe("要检出的分支"),
      username: z.string().optional().describe("Git用户名"),
      password: z.string().optional().describe("Git密码或令牌"),
      depth: z.number().optional().describe("Git克隆深度"),
    },
    async (params) => {
      try {
        const result = await gitService.cloneRepository(params.url, {
          branch: params.branch,
          username: params.username,
          password: params.password,
          depth: params.depth,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, projectPath: result.projectPath }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 使用本地项目工具
  server.tool(
    "use-local-project",
    {
      path: z.string().describe("本地项目路径"),
    },
    async (params) => {
      try {
        const result = await gitService.useLocalProject(params.path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, projectPath: result.projectPath }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 启动浏览器工具
  server.tool(
    "launch-browser",
    {
      browserType: z.enum(["chromium", "firefox", "webkit"]).describe("浏览器类型"),
      headless: z.boolean().optional().describe("是否使用无头模式"),
      slowMo: z.number().optional().describe("操作减速毫秒数"),
      viewport: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional()
        .describe("浏览器视口尺寸"),
    },
    async (params) => {
      try {
        await playwrightService.launchBrowser({
          browserType: params.browserType,
          headless: params.headless,
          slowMo: params.slowMo,
          viewport: params.viewport,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 配置HTTP传输
  const transport = new HTTPTransport({ port });

  // 连接传输
  server.connect(transport).catch((error) => {
    console.error("MCP服务器启动失败:", error);
  });

  console.log(`PlaywrightMCP服务器已在端口${port}上启动`);

  return server;
}

// 导出主要服务
export * from "./services";

// 导出类型定义
export * as CoreTypes from "./types/core";
export * as MCPTypes from "./types/mcp";

// 导出默认创建函数
export default createMCPServer;
