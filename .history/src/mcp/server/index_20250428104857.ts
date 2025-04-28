import {
  createServer,
  ToolDefinition,
  ResourceDefinition,
  ServerTransport,
  HttpTransport,
  BaseServer,
  z
} from '@modelcontextprotocol/sdk';
import { GitService, PlaywrightService, TestGeneratorService, TestExecutionService } from '../../services';
import { MCPTypes } from '../../types/mcp';

/**
 * Create an MCP server instance for Playwright testing
 */
export function createMCPServer(options: { port?: number; transport?: 'http' } = {}): BaseServer {
  // Initialize services
  const gitService = new GitService();
  const playwrightService = new PlaywrightService();
  const testGenerator = new TestGeneratorService();
  const testExecution = new TestExecutionService(playwrightService);

  const port = options.port || 8931;
  const transport: ServerTransport =
    options.transport === 'http'
      ? new HttpTransport({ port })
      : new HttpTransport({ port });

  // Define resources
  const resources: ResourceDefinition[] = [
    {
      name: 'reports',
      description: 'Fetch test execution reports',
      parameters: z.object({
        reportId: z.string().describe('The ID of the report to retrieve'),
        type: z.enum(['test-results', 'error-report'])
          .describe('Type of report to retrieve (test results or error report)')
      }),
      handler: async (params: MCPTypes.GetReportParams) => {
        try {
          const report = await testExecution.getReport(params.reportId, params.type);
          return {
            report
          };
        } catch (error) {
          console.error('Error fetching report:', error);
          return {
            error: error instanceof Error ? error.message : 'Unknown error fetching report'
          };
        }
      }
    },
    {
      name: 'api-specs',
      description: 'Retrieve API specifications',
      parameters: z.object({
        specId: z.string().optional().describe('The ID of the API spec to retrieve. If not provided, returns a list of available specs')
      }),
      handler: async (params: { specId?: string }) => {
        try {
          // This is a placeholder - you'd implement a real API spec retrieval
          return {
            specs: [
              {
                id: 'example-api',
                name: 'Example API',
                description: 'An example API specification'
              }
            ]
          };
        } catch (error) {
          console.error('Error retrieving API specs:', error);
          return {
            error: error instanceof Error ? error.message : 'Unknown error retrieving API specs'
          };
        }
      }
    },
    {
      name: 'test-cases',
      description: 'Retrieve test cases',
      parameters: z.object({
        testSuiteId: z.string().describe('The ID of the test suite to retrieve')
      }),
      handler: async (params: MCPTypes.GetTestCasesParams) => {
        try {
          const testSuite = await testGenerator.getTestCases(params.testSuiteId);
          return {
            testSuite
          };
        } catch (error) {
          console.error('Error retrieving test cases:', error);
          return {
            error: error instanceof Error ? error.message : 'Unknown error retrieving test cases'
          };
        }
      }
    }
  ];

  // Define tools
  const tools: ToolDefinition[] = [
    {
      name: 'clone-repository',
      description: 'Clone a Git repository for testing',
      parameters: z.object({
        url: z.string().describe('URL of the Git repository'),
        branch: z.string().optional().describe('Branch to checkout'),
        depth: z.number().optional().describe('Depth of the clone'),
        credentials: z.object({
          username: z.string(),
          password: z.string()
        }).optional().describe('Git credentials if needed')
      }),
      handler: async (params: MCPTypes.CloneRepositoryParams) => {
        try {
          const result = await gitService.cloneRepository({
            url: params.url,
            branch: params.branch,
            depth: params.depth,
            credentials: params.credentials
          });

          return {
            success: true,
            projectPath: result
          };
        } catch (error) {
          console.error('Error cloning repository:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error cloning repository'
          };
        }
      }
    },
    {
      name: 'use-local-project',
      description: 'Use a local project for testing',
      parameters: z.object({
        projectPath: z.string().describe('Path to the local project')
      }),
      handler: async (params: MCPTypes.UseLocalProjectParams) => {
        try {
          const result = await gitService.useLocalProject(params.projectPath);

          return {
            success: true,
            projectPath: result
          };
        } catch (error) {
          console.error('Error using local project:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error using local project'
          };
        }
      }
    },
    {
      name: 'launch-browser',
      description: 'Launch a browser for testing',
      parameters: z.object({
        browserType: z.enum(['chromium', 'firefox', 'webkit']).optional().describe('Type of browser to launch'),
        headless: z.boolean().optional().describe('Whether to run browser in headless mode'),
        width: z.number().optional().describe('Browser viewport width'),
        height: z.number().optional().describe('Browser viewport height')
      }),
      handler: async (params: MCPTypes.LaunchBrowserParams) => {
        try {
          await playwrightService.launchBrowser({
            browserType: params.browserType,
            headless: params.headless,
            width: params.width,
            height: params.height
          });

          return {
            success: true,
            browserType: params.browserType || 'chromium'
          };
        } catch (error) {
          console.error('Error launching browser:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error launching browser'
          };
        }
      }
    },
    {
      name: 'generate-tests-from-text',
      description: 'Generate test cases from text requirements',
      parameters: z.object({
        requirements: z.string().describe('Text requirements to generate tests from'),
        testType: z.enum(['ui', 'api']).describe('Type of tests to generate'),
        apiSpec: z.string().optional().describe('API specification for API tests')
      }),
      handler: async (params: MCPTypes.GenerateTestsFromTextParams) => {
        try {
          const result = await testGenerator.generateFromText(
            params.requirements,
            params.testType,
            params.apiSpec
          );

          if (!result.success) {
            throw new Error(result.error);
          }

          return {
            success: true,
            testSuiteId: result.testSuiteId,
            testSuiteName: result.testSuiteName,
            testCasesCount: result.testCasesCount
          };
        } catch (error) {
          console.error('Error generating tests from text:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error generating tests'
          };
        }
      }
    },
    {
      name: 'generate-tests-from-document',
      description: 'Generate test cases from a document',
      parameters: z.object({
        documentPath: z.string().describe('Path to the document with requirements'),
        testType: z.enum(['ui', 'api']).describe('Type of tests to generate'),
        apiSpec: z.string().optional().describe('API specification for API tests')
      }),
      handler: async (params: MCPTypes.GenerateTestsFromDocumentParams) => {
        try {
          const result = await testGenerator.generateFromDocument(
            params.documentPath,
            params.testType,
            params.apiSpec
          );

          if (!result.success) {
            throw new Error(result.error);
          }

          return {
            success: true,
            testSuiteId: result.testSuiteId,
            testSuiteName: result.testSuiteName,
            testCasesCount: result.testCasesCount
          };
        } catch (error) {
          console.error('Error generating tests from document:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error generating tests'
          };
        }
      }
    },
    {
      name: 'run-tests',
      description: 'Run tests from a test suite',
      parameters: z.object({
        testSuiteId: z.string().describe('ID of the test suite to run')
      }),
      handler: async (params: MCPTypes.RunTestsParams) => {
        try {
          const results = await testExecution.runTests(params.testSuiteId);

          return {
            success: true,
            reportId: results.id,
            totalTests: results.totalTests,
            passedTests: results.passedTests,
            failedTests: results.failedTests,
            duration: results.duration
          };
        } catch (error) {
          console.error('Error running tests:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error running tests'
          };
        }
      }
    },
    {
      name: 'api-test',
      description: 'Generate and run API tests',
      parameters: z.object({
        apiSpecPath: z.string().describe('Path to API specification file'),
        endpoints: z.array(z.string()).optional().describe('Specific endpoints to test'),
        methods: z.array(z.string()).optional().describe('Specific HTTP methods to test'),
        generateForAll: z.boolean().optional().describe('Generate tests for all endpoints if true')
      }),
      handler: async (params: MCPTypes.ApiTestParams) => {
        try {
          // This is a placeholder - you'd implement real API testing
          return {
            success: true,
            testSuiteId: 'api-test-suite-id',
            endpointsCovered: ['GET /users', 'POST /users'],
            testCasesCount: 10
          };
        } catch (error) {
          console.error('Error running API tests:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error running API tests'
          };
        }
      }
    }
  ];

  // Create and return the server
  return createServer({
    transport,
    resources,
    tools
  });
}

// If this file is run directly
if (require.main === module) {
  const server = createMCPServer({
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
export function createMcpServer(options: { port?: number; transport?: "stdio" | "http" }) {
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
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching report:", error);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching report: ${(error as Error).message}`,
            },
          ],
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
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(apiSpec, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching API spec:", error);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching API spec: ${(error as Error).message}`,
            },
          ],
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
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(testCases, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching test cases:", error);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching test cases: ${(error as Error).message}`,
            },
          ],
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
          content: [
            {
              type: "text",
              text: `Repository cloned successfully to ${result.projectPath}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error cloning repository:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error cloning repository: ${(error as Error).message}`,
            },
          ],
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
          content: [
            {
              type: "text",
              text: `Local project set to ${result.projectPath}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error setting local project:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error setting local project: ${(error as Error).message}`,
            },
          ],
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
      viewport: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    },
    async ({ headless, slowMo, viewport }) => {
      try {
        await playwrightService.launchBrowser({
          headless,
          slowMo,
          viewport,
        });

        return {
          content: [
            {
              type: "text",
              text: "Browser launched successfully",
            },
          ],
        };
      } catch (error) {
        console.error("Error launching browser:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error launching browser: ${(error as Error).message}`,
            },
          ],
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
        const testSuiteId = await testGeneratorService.generateFromText(requirementsText, testType);

        return {
          content: [
            {
              type: "text",
              text: `Test cases generated successfully. Access them at test-cases://${testSuiteId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error generating test cases:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error generating test cases: ${(error as Error).message}`,
            },
          ],
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
        const testSuiteId = await testGeneratorService.generateFromDocument(documentPath, testType);

        return {
          content: [
            {
              type: "text",
              text: `Test cases generated successfully. Access them at test-cases://${testSuiteId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error generating test cases:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error generating test cases: ${(error as Error).message}`,
            },
          ],
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
          content: [
            {
              type: "text",
              text: `Tests executed successfully. Access the report at reports://${reportId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error running tests:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error running tests: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // 获取控制台消息
  server.tool("get-console-logs", {}, async () => {
    try {
      const logs = await playwrightService.getConsoleLogs();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting console logs:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting console logs: ${(error as Error).message}`,
          },
        ],
      };
    }
  });

  // 获取网络请求
  server.tool("get-network-requests", {}, async () => {
    try {
      const requests = await playwrightService.getNetworkRequests();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(requests, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting network requests:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting network requests: ${(error as Error).message}`,
          },
        ],
      };
    }
  });

  // 生成错误报告
  server.tool("generate-error-report", {}, async () => {
    try {
      const reportId = await testExecutionService.generateErrorReport();

      return {
        content: [
          {
            type: "text",
            text: `Error report generated successfully. Access it at reports://${reportId}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error generating error report:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error generating error report: ${(error as Error).message}`,
          },
        ],
      };
    }
  });

  // 从API文档生成测试用例
  server.tool(
    "generate-api-tests-from-spec",
    {
      specPath: z.string(),
      format: z.enum(["openapi", "swagger", "apifox", "auto"]).optional(),
    },
    async ({ specPath, format }) => {
      try {
        const testSuiteId = await apiTestingService.generateTestsFromSpec(specPath, format);

        return {
          content: [
            {
              type: "text",
              text: `API test cases generated successfully. Access them at test-cases://${testSuiteId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error generating API test cases:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error generating API test cases: ${(error as Error).message}`,
            },
          ],
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
          content: [
            {
              type: "text",
              text: `API endpoint ${method} ${endpoint} mocked successfully`,
            },
          ],
        };
      } catch (error) {
        console.error("Error mocking API endpoint:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error mocking API endpoint: ${(error as Error).message}`,
            },
          ],
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
          content: [
            {
              type: "text",
              text: `API tests executed successfully. Access the report at reports://${reportId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error running API tests:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error running API tests: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // 清理资源
  server.tool("close-browser", {}, async () => {
    try {
      await playwrightService.closeBrowser();

      return {
        content: [
          {
            type: "text",
            text: "Browser closed successfully",
          },
        ],
      };
    } catch (error) {
      console.error("Error closing browser:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error closing browser: ${(error as Error).message}`,
          },
        ],
      };
    }
  });

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

Please provide detailed test cases that cover all the functionality described.`,
          },
        },
      ],
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

      app.post("/mcp", async (req, res) => {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
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
            },
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
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send("Invalid or missing session ID");
          return;
        }

        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      };

      app.get("/mcp", handleSessionRequest);
      app.delete("/mcp", handleSessionRequest);

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
