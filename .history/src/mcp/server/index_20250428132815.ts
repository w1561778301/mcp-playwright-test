/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description:
 */
import {
  createServer,
  ToolDefinition,
  ResourceDefinition,
  ServerTransport,
  HttpTransport,
  BaseServer,
  z,
  Tool,
  Resource,
} from "@modelcontextprotocol/sdk";
import {
  GitService,
  PlaywrightService,
  TestGeneratorService,
  TestExecutionService,
  ApiTestingService,
} from "../../services";
import { CoreTypes } from "../../types/core";
import { MCPTypes } from "../../types/mcp";

// 创建服务实例
const gitService = new GitService();
const playwrightService = new PlaywrightService();
const testGenerator = new TestGeneratorService();
const testExecution = new TestExecutionService(playwrightService);
const apiTesting = new ApiTestingService();

/**
 * Create an MCP server instance for Playwright testing
 */
export function createMCPServer(options: { port?: number; transport?: "http" } = {}): BaseServer {
  const port = options.port || 8931;
  const transport: ServerTransport =
    options.transport === "http" ? new HttpTransport({ port }) : new HttpTransport({ port });

  // Create and return the server
  return createServer({
    transport,
    resources: createResources(),
    tools: createTools(),
  });
}

// If this file is run directly
if (require.main === module) {
  const server = createMCPServer({
    transport: "http",
  });
  server.start().catch(console.error);
}

/**
 * 创建MCP工具
 * @returns MCP工具数组
 */
export function createTools(): Tool[] {
  return [
    {
      name: "clone-repository",
      description: "克隆Git仓库进行测试",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Git仓库的URL",
          },
          branch: {
            type: "string",
            description: "要检出的分支（可选）",
          },
          depth: {
            type: "number",
            description: "克隆深度（可选）",
          },
          credentials: {
            type: "object",
            properties: {
              username: { type: "string" },
              password: { type: "string" },
            },
            description: "Git凭据（如需要）",
          },
        },
        required: ["url"],
      },
      execute: async (params: {
        url: string;
        branch?: string;
        depth?: number;
        credentials?: { username: string; password: string };
      }) => {
        try {
          // 使用正确的参数格式调用
          const result = await gitService.cloneRepository(params.url, {
            branch: params.branch,
            depth: params.depth,
            username: params.credentials?.username,
            password: params.credentials?.password,
          });

          return {
            success: true,
            projectPath: result.projectPath,
          };
        } catch (error: any) {
          console.error("Error cloning repository:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error cloning repository",
          };
        }
      },
    },
    {
      name: "use-local-project",
      description: "使用本地项目进行测试",
      parameters: {
        type: "object",
        properties: {
          projectPath: {
            type: "string",
            description: "本地项目路径",
          },
        },
        required: ["projectPath"],
      },
      execute: async (params: { projectPath: string }) => {
        try {
          const result = await gitService.useLocalProject(params.projectPath);

          return {
            success: true,
            projectPath: result.projectPath,
          };
        } catch (error: any) {
          console.error("Error using local project:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error using local project",
          };
        }
      },
    },
    {
      name: "launch-browser",
      description: "启动浏览器进行测试",
      parameters: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
            description: "要启动的浏览器类型",
          },
          headless: {
            type: "boolean",
            description: "是否以无头模式运行浏览器",
          },
          viewport: {
            type: "object",
            properties: {
              width: { type: "number" },
              height: { type: "number" },
            },
            description: "浏览器视口尺寸",
          },
        },
      },
      execute: async (params: {
        browserType?: "chromium" | "firefox" | "webkit";
        headless?: boolean;
        viewport?: { width: number; height: number };
      }) => {
        try {
          // 匹配PlaywrightService的API
          const browserOptions = {
            browserType: params.browserType,
            headless: params.headless,
            viewport: params.viewport,
          };

          await playwrightService.launchBrowser(browserOptions);

          return {
            success: true,
            browserType: params.browserType || "chromium",
          };
        } catch (error: any) {
          console.error("Error launching browser:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error launching browser",
          };
        }
      },
    },
    {
      name: "generate-tests-from-text",
      description: "从文本需求生成测试用例",
      parameters: {
        type: "object",
        properties: {
          requirementsText: {
            type: "string",
            description: "测试需求文本",
          },
          testType: {
            type: "string",
            enum: ["ui", "api"],
            description: "要生成的测试类型",
          },
          apiSpec: {
            type: "string",
            description: "API规范（可选）",
          },
        },
        required: ["requirementsText", "testType"],
      },
      execute: async (params: { requirementsText: string; testType: "ui" | "api"; apiSpec?: string }) => {
        try {
          const result = await testGenerator.generateFromText(params.requirementsText, params.testType, params.apiSpec);

          return result;
        } catch (error: any) {
          console.error("Error generating tests from text:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error generating tests",
          };
        }
      },
    },
    {
      name: "generate-tests-from-document",
      description: "从文档生成测试用例",
      parameters: {
        type: "object",
        properties: {
          documentPath: {
            type: "string",
            description: "文档路径",
          },
          testType: {
            type: "string",
            enum: ["ui", "api"],
            description: "要生成的测试类型",
          },
          apiSpec: {
            type: "string",
            description: "API规范（可选）",
          },
        },
        required: ["documentPath", "testType"],
      },
      execute: async (params: { documentPath: string; testType: "ui" | "api"; apiSpec?: string }) => {
        try {
          const result = await testGenerator.generateFromDocument(params.documentPath, params.testType, params.apiSpec);

          return result;
        } catch (error: any) {
          console.error("Error generating tests from document:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error generating tests",
          };
        }
      },
    },
    {
      name: "run-tests",
      description: "运行测试套件",
      parameters: {
        type: "object",
        properties: {
          testSuiteId: {
            type: "string",
            description: "测试套件ID",
          },
          options: {
            type: "object",
            description: "测试执行选项",
          },
        },
        required: ["testSuiteId"],
      },
      execute: async (params: { testSuiteId: string; options?: any }) => {
        try {
          const resultId = await testExecution.runTests(params.testSuiteId);

          // 获取测试结果
          const report = (await testExecution.getReport(resultId)) as any;

          return {
            success: true,
            reportId: report.id,
            totalTests: report.testCases?.length || 0,
            passedTests: report.testCases?.filter((r: any) => r.passed).length || 0,
            failedTests: report.testCases?.filter((r: any) => !r.passed).length || 0,
            duration: report.duration,
          };
        } catch (error: any) {
          console.error("Error running tests:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error running tests",
          };
        }
      },
    },
    {
      name: "api-test",
      description: "生成并运行API测试",
      parameters: {
        type: "object",
        properties: {
          specPath: {
            type: "string",
            description: "API规范文件路径",
          },
          specFormat: {
            type: "string",
            enum: ["openapi", "swagger", "apifox", "auto"],
            description: "规范格式",
          },
        },
        required: ["specPath"],
      },
      execute: async (params: { specPath: string; specFormat?: "openapi" | "swagger" | "apifox" | "auto" }) => {
        try {
          // 从规范生成测试套件
          const testSuiteId = await apiTesting.generateTestsFromSpec(params.specPath, params.specFormat || "auto");

          // 运行生成的测试套件
          const resultId = await apiTesting.runApiTests(testSuiteId);

          return {
            success: true,
            testSuiteId,
            resultId,
          };
        } catch (error: any) {
          console.error("Error executing API tests:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error executing API tests",
          };
        }
      },
    },
  ];
}

/**
 * 创建MCP资源
 * @returns MCP资源数组
 */
export function createResources(): Resource[] {
  return [
    {
      name: "reports",
      description: "获取测试执行报告",
      parameters: {
        type: "object",
        properties: {
          reportId: {
            type: "string",
            description: "要检索的报告ID",
          },
          type: {
            type: "string",
            enum: ["test-results", "error-report"],
            description: "报告类型",
          },
        },
        required: ["reportId"],
      },
      retrieve: async (params: { reportId: string; type?: "test-results" | "error-report" }) => {
        try {
          // 只传递reportId参数
          const report = await testExecution.getReport(params.reportId);
          return {
            report,
          };
        } catch (error: any) {
          console.error("Error fetching report:", error);
          return {
            error: error instanceof Error ? error.message : "Unknown error fetching report",
          };
        }
      },
    },
    {
      name: "test-cases",
      description: "检索测试用例",
      parameters: {
        type: "object",
        properties: {
          testSuiteId: {
            type: "string",
            description: "要检索的测试套件ID",
          },
        },
        required: ["testSuiteId"],
      },
      retrieve: async (params: { testSuiteId: string }) => {
        try {
          const testSuite = await testGenerator.getTestCases(params.testSuiteId);
          return {
            testSuite,
          };
        } catch (error: any) {
          console.error("Error retrieving test cases:", error);
          return {
            error: error instanceof Error ? error.message : "Unknown error retrieving test cases",
          };
        }
      },
    },
  ];
}
