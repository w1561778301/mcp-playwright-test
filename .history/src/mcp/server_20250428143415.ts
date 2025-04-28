/**
 * @file MCP Server Implementation
 * @version 0.1.0
 * @author MCP Playwright Test Team
 * @date 2025-04-28
 * @description Main server implementation for Model Context Protocol (MCP) Playwright testing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "@modelcontextprotocol/sdk";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/resources.js";
import { createHTTPTransport } from "./transports/streamable-http";
import { GitService } from "../services/git-service";
import { PlaywrightService } from "../services/playwright-service";
import { TestGeneratorService } from "../services/test-generator-service";
import { TestExecutionService } from "../services/test-execution-service";
import { ApiTestingService } from "../services/api-testing-service";
import fs from "fs";

/**
 * 创建MCP服务器实例
 * @param options 服务器配置选项
 * @returns 配置好的MCP服务器实例
 */
export function createPlaywrightMCPServer(
  options: {
    port?: number;
    transport?: "http" | "stdio";
    stateful?: boolean;
    logLevel?: "none" | "error" | "warn" | "info" | "debug";
  } = {}
) {
  const port = options.port || 8931;
  const transportType = options.transport || "http";
  const stateful = options.stateful !== undefined ? options.stateful : true;
  const logLevel = options.logLevel || "info";

  // 创建服务器实例
  const server = new McpServer({
    name: "playwright-mcp",
    version: "0.1.0",
    description: "MCP Server for Playwright Testing",
  });

  // 初始化服务
  const gitService = new GitService();
  const playwrightService = new PlaywrightService();
  const testGenerator = new TestGeneratorService();
  const testExecution = new TestExecutionService(playwrightService);
  const apiTesting = new ApiTestingService();

  // 注册工具：克隆Git仓库
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
        const result = await gitService.cloneRepository(params.url as string, {
          branch: params.branch as string | undefined,
          username: params.username as string | undefined,
          password: params.password as string | undefined,
          depth: params.depth as number | undefined,
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

  // 注册工具：使用本地项目
  server.tool(
    "use-local-project",
    {
      path: z.string().describe("本地项目路径"),
    },
    async (params) => {
      try {
        const result = await gitService.useLocalProject(params.path as string);
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

  // 注册工具：启动浏览器
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
          browserType: params.browserType as "chromium" | "firefox" | "webkit",
          headless: params.headless as boolean | undefined,
          slowMo: params.slowMo as number | undefined,
          viewport: params.viewport as { width: number; height: number } | undefined,
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

  // 注册工具：生成测试用例
  server.tool(
    "generate-test-cases",
    {
      requirements: z.string().describe("测试需求描述"),
      testType: z.enum(["ui", "api"]).describe("测试类型"),
      projectPath: z.string().optional().describe("项目代码路径"),
      apiSpec: z.string().optional().describe("API规范文档路径"),
    },
    async (params) => {
      try {
        // 使用TestGeneratorService生成测试用例
        let apiSpecContent: string | undefined;

        // 如果提供了API规范文档路径，读取其内容
        if (params.apiSpec && fs.existsSync(params.apiSpec as string)) {
          apiSpecContent = fs.readFileSync(params.apiSpec as string, "utf-8");
        }

        // 调用generateFromText方法生成测试用例
        const result = await testGenerator.generateFromText(
          params.requirements as string,
          params.testType as "ui" | "api",
          apiSpecContent
        );

        if (!result.success) {
          throw new Error(result.error || "测试用例生成失败");
        }

        // 获取生成的测试用例
        const testSuite = await testGenerator.getTestCases(result.testSuiteId!);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                testSuiteId: result.testSuiteId,
                testSuiteName: result.testSuiteName,
                testCasesCount: result.testCasesCount,
                testCases: testSuite.testCases,
              }),
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

  // 注册工具：执行UI测试
  server.tool(
    "execute-ui-tests",
    {
      testSuiteId: z.string().describe("测试套件ID"),
      baseUrl: z.string().optional().describe("应用基础URL"),
      timeout: z.number().optional().describe("测试超时（毫秒）"),
    },
    async (params) => {
      try {
        // 使用TestExecutionService执行测试
        const reportId = await testExecution.runTests(params.testSuiteId as string);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, reportId }),
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

  // 注册工具：执行API测试
  server.tool(
    "execute-api-tests",
    {
      testSuiteId: z.string().describe("API测试套件ID"),
      baseUrl: z.string().optional().describe("API基础URL"),
      headers: z.record(z.string()).optional().describe("请求头"),
    },
    async (params) => {
      try {
        // 使用ApiTestingService执行API测试
        const reportId = await apiTesting.runApiTests(params.testSuiteId as string);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, reportId }),
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

  // 注册资源：获取测试报告
  server.resource("test-report", new ResourceTemplate("test-report://{reportId}", {}), async (uri, params) => {
    try {
      // 使用TestExecutionService获取测试报告
      const report = await testExecution.getReport(params.reportId);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get test report: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册资源：获取API测试报告
  server.resource("api-test-report", new ResourceTemplate("api-test-report://{reportId}", {}), async (uri, params) => {
    try {
      // 使用ApiTestingService获取API测试报告
      const report = await apiTesting.getReport(params.reportId);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get API test report: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册资源：获取测试用例
  server.resource(
    "test-case",
    new ResourceTemplate("test-case://{testSuiteId}/{testCaseId}", {}),
    async (uri, params) => {
      try {
        // 获取测试套件
        const testSuite = await testGenerator.getTestCases(params.testSuiteId);
        // 从测试套件的测试用例数组中找到匹配的测试用例
        const testCase = testSuite.testCases.find((tc) => tc.id === params.testCaseId);

        if (!testCase) {
          throw new Error(`Test case not found: ${params.testCaseId}`);
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(testCase, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to get test case: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // 注册资源：获取控制台日志
  server.resource("console-logs", new ResourceTemplate("console-logs://browser", { list: undefined }), async (uri) => {
    try {
      const logs = await playwrightService.getConsoleLogs();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get console logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册资源：获取网络请求
  server.resource(
    "network-requests",
    new ResourceTemplate("network-requests://browser", { list: undefined }),
    async (uri) => {
      try {
        const requests = await playwrightService.getNetworkRequests();
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(requests, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to get network requests: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // 根据配置选择传输类型
  if (transportType === "http") {
    // 配置HTTP传输
    const closeTransport = createHTTPTransport(server, {
      port,
      stateful,
      logLevel,
    });

    console.log(`PlaywrightMCP服务器已在端口${port}上启动，使用HTTP传输`);
  } else if (transportType === "stdio") {
    // 配置stdio传输
    const transport = new StdioServerTransport();

    // 连接传输
    server.connect(transport).catch((error) => {
      console.error("MCP服务器启动失败:", error);
    });

    console.log(`PlaywrightMCP服务器已启动，使用stdio传输`);
  }

  return server;
}

export default createPlaywrightMCPServer;
