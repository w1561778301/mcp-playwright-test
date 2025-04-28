import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { GitService } from "../../services/git-service";
import { PlaywrightService } from "../../services/playwright-service";
import { TestGeneratorService } from "../../services/test-generator-service";
import { TestExecutionService } from "../../services/test-execution-service";
import { ApiTestingService } from "../../services/api-testing-service";

/**
 * 创建MCP服务器实例
 */
export function createMcpServer(options: {
  port?: number;
  transport?: "stdio" | "http";
}) {
  const server = new McpServer({
    name: "Playwright-MCP-Test",
    version: "1.0.0",
  });

  // 初始化服务
  const gitService = new GitService();
  const playwrightService = new PlaywrightService();
  const testGeneratorService = new TestGeneratorService();
  const testExecutionService = new TestExecutionService(playwrightService);
  const apiTestingService = new ApiTestingService();

  // 定义资源
  // 测试报告资源
  server.resource(
    "reports",
    new ResourceTemplate("reports://{reportId}", { list: undefined }),
    async (uri, { reportId }) => {
      try {
        const report = await testExecutionService.getReport(reportId);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(report, null, 2)
          }]
        };
      } catch (error) {
        console.error("Error fetching report:", error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching report: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // API文档资源
  server.resource(
    "api-specs",
    new ResourceTemplate("api-specs://{specId}", { list: undefined }),
    async (uri, { specId }) => {
      try {
        const apiSpec = await apiTestingService.getApiSpec(specId);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(apiSpec, null, 2)
          }]
        };
      } catch (error) {
        console.error("Error fetching API spec:", error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching API spec: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 测试用例资源
  server.resource(
    "test-cases",
    new ResourceTemplate("test-cases://{testSuiteId}", { list: undefined }),
    async (uri, { testSuiteId }) => {
      try {
        const testCases = await testGeneratorService.getTestCases(testSuiteId);
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(testCases, null, 2)
          }]
        };
      } catch (error) {
        console.error("Error fetching test cases:", error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching test cases: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 定义工具

  // 克隆Git仓库
  server.tool(
    "clone-repository",
    {
      repositoryUrl: z.string().url(),
      username: z.string().optional(),
      password: z.string().optional(),
      branch: z.string().optional(),
    },
    async ({ repositoryUrl, username, password, branch }) => {
      try {
        const result = await gitService.cloneRepository(repositoryUrl, {
          username,
          password,
          branch,
        });

        return {
          content: [{
            type: "text",
            text: `Repository cloned successfully to ${result.projectPath}`
          }]
        };
      } catch (error) {
        console.error("Error cloning repository:", error);
        return {
          content: [{
            type: "text",
            text: `Error cloning repository: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 使用本地项目
  server.tool(
    "use-local-project",
    {
      projectPath: z.string(),
    },
    async ({ projectPath }) => {
      try {
        const result = await gitService.useLocalProject(projectPath);

        return {
          content: [{
            type: "text",
            text: `Local project set to ${result.projectPath}`
          }]
        };
      } catch (error) {
        console.error("Error setting local project:", error);
        return {
          content: [{
            type: "text",
            text: `Error setting local project: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 启动浏览器
  server.tool(
    "launch-browser",
    {
      headless: z.boolean().optional(),
      slowMo: z.number().optional(),
      viewport: z.object({
        width: z.number(),
        height: z.number(),
      }).optional(),
    },
    async ({ headless, slowMo, viewport }) => {
      try {
        await playwrightService.launchBrowser({
          headless,
          slowMo,
          viewport,
        });

        return {
          content: [{
            type: "text",
            text: "Browser launched successfully"
          }]
        };
      } catch (error) {
        console.error("Error launching browser:", error);
        return {
          content: [{
            type: "text",
            text: `Error launching browser: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 从需求文本生成测试用例
  server.tool(
    "generate-tests-from-text",
    {
      requirementsText: z.string(),
      testType: z.enum(["ui", "api", "both"]),
    },
    async ({ requirementsText, testType }) => {
      try {
        const testSuiteId = await testGeneratorService.generateFromText(
          requirementsText,
          testType
        );

        return {
          content: [{
            type: "text",
            text: `Test cases generated successfully. Access them at test-cases://${testSuiteId}`
          }]
        };
      } catch (error) {
        console.error("Error generating test cases:", error);
        return {
          content: [{
            type: "text",
            text: `Error generating test cases: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 从需求文档生成测试用例
  server.tool(
    "generate-tests-from-document",
    {
      documentPath: z.string(),
      testType: z.enum(["ui", "api", "both"]),
    },
    async ({ documentPath, testType }) => {
      try {
        const testSuiteId = await testGeneratorService.generateFromDocument(
          documentPath,
          testType
        );

        return {
          content: [{
            type: "text",
            text: `Test cases generated successfully. Access them at test-cases://${testSuiteId}`
          }]
        };
      } catch (error) {
        console.error("Error generating test cases:", error);
        return {
          content: [{
            type: "text",
            text: `Error generating test cases: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 执行测试用例
  server.tool(
    "run-tests",
    {
      testSuiteId: z.string(),
    },
    async ({ testSuiteId }) => {
      try {
        const reportId = await testExecutionService.runTests(testSuiteId);

        return {
          content: [{
            type: "text",
            text: `Tests executed successfully. Access the report at reports://${reportId}`
          }]
        };
      } catch (error) {
        console.error("Error running tests:", error);
        return {
          content: [{
            type: "text",
            text: `Error running tests: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 获取控制台消息
  server.tool(
    "get-console-logs",
    {},
    async () => {
      try {
        const logs = await playwrightService.getConsoleLogs();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(logs, null, 2)
          }]
        };
      } catch (error) {
        console.error("Error getting console logs:", error);
        return {
          content: [{
            type: "text",
            text: `Error getting console logs: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 获取网络请求
  server.tool(
    "get-network-requests",
    {},
    async () => {
      try {
        const requests = await playwrightService.getNetworkRequests();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(requests, null, 2)
          }]
        };
      } catch (error) {
        console.error("Error getting network requests:", error);
        return {
          content: [{
            type: "text",
            text: `Error getting network requests: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 生成错误报告
  server.tool(
    "generate-error-report",
    {},
    async () => {
      try {
        const reportId = await testExecutionService.generateErrorReport();

        return {
          content: [{
            type: "text",
            text: `Error report generated successfully. Access it at reports://${reportId}`
          }]
        };
      } catch (error) {
        console.error("Error generating error report:", error);
        return {
          content: [{
            type: "text",
            text: `Error generating error report: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 从API文档生成测试用例
  server.tool(
    "generate-api-tests-from-spec",
    {
      specPath: z.string(),
      format: z.enum(["openapi", "swagger", "apifox", "auto"]).optional(),
    },
    async ({ specPath, format }) => {
      try {
        const testSuiteId = await apiTestingService.generateTestsFromSpec(
          specPath,
          format
        );

        return {
          content: [{
            type: "text",
            text: `API test cases generated successfully. Access them at test-cases://${testSuiteId}`
          }]
        };
      } catch (error) {
        console.error("Error generating API test cases:", error);
        return {
          content: [{
            type: "text",
            text: `Error generating API test cases: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // Mock API接口
  server.tool(
    "mock-api-endpoint",
    {
      endpoint: z.string(),
      method: z.string(),
      statusCode: z.number().optional(),
      response: z.any(),
    },
    async ({ endpoint, method, statusCode, response }) => {
      try {
        await apiTestingService.mockApiEndpoint(endpoint, method, statusCode || 200, response);

        return {
          content: [{
            type: "text",
            text: `API endpoint ${method} ${endpoint} mocked successfully`
          }]
        };
      } catch (error) {
        console.error("Error mocking API endpoint:", error);
        return {
          content: [{
            type: "text",
            text: `Error mocking API endpoint: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 运行API测试
  server.tool(
    "run-api-tests",
    {
      testSuiteId: z.string(),
    },
    async ({ testSuiteId }) => {
      try {
        const reportId = await apiTestingService.runApiTests(testSuiteId);

        return {
          content: [{
            type: "text",
            text: `API tests executed successfully. Access the report at reports://${reportId}`
          }]
        };
      } catch (error) {
        console.error("Error running API tests:", error);
        return {
          content: [{
            type: "text",
            text: `Error running API tests: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 清理资源
  server.tool(
    "close-browser",
    {},
    async () => {
      try {
        await playwrightService.closeBrowser();

        return {
          content: [{
            type: "text",
            text: "Browser closed successfully"
          }]
        };
      } catch (error) {
        console.error("Error closing browser:", error);
        return {
          content: [{
            type: "text",
            text: `Error closing browser: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  // 定义提示模板
  server.prompt(
    "test-generation",
    {
      requirements: z.string(),
      testType: z.enum(["ui", "api", "both"]).optional(),
    },
    ({ requirements, testType = "both" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate test cases from the following requirements:

Requirements:
${requirements}

Test Types: ${testType}

Please provide detailed test cases that cover all the functionality described.`
          }
        }
      ]
    })
  );

  // 启动服务器
  async function start() {
    if (options.transport === "http") {
      // HTTP传输
      const app = express();
      app.use(express.json());

      // 会话管理
      const transports: Record<string, StreamableHTTPServerTransport> = {};

      app.post('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          transport = transports[sessionId];
        } else {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              if (sid) {
                transports[sid] = transport;
              }
            }
          });

          transport.onclose = () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
            }
          };

          await server.connect(transport);
        }

        await transport.handleRequest(req, res, req.body);
      });

      const handleSessionRequest = async (req: express.Request, res: express.Response) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      };

      app.get('/mcp', handleSessionRequest);
      app.delete('/mcp', handleSessionRequest);

      const port = options.port || 8931;

      app.listen(port, () => {
        console.log(`Playwright MCP Test server listening on port ${port}`);
      });
    } else {
      // STDIO传输
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log("Playwright MCP Test server started with stdio transport");
    }
  }

  return {
    server,
    start,
  };
}

// 如果直接运行此文件
if (require.main === module) {
  const { start } = createMcpServer({
    transport: "stdio",
  });
  start().catch(console.error);
}
