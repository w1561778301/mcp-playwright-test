import {
  createServer,
  ToolDefinition,
  ResourceDefinition,
  ServerTransport,
  HttpTransport,
  BaseServer,
  z,
} from "@modelcontextprotocol/sdk";
import { GitService, PlaywrightService, TestGeneratorService, TestExecutionService } from "../../services";
import { MCPTypes } from "../../types/mcp";

/**
 * Create an MCP server instance for Playwright testing
 */
export function createMCPServer(options: { port?: number; transport?: "http" } = {}): BaseServer {
  // Initialize services
  const gitService = new GitService();
  const playwrightService = new PlaywrightService();
  const testGenerator = new TestGeneratorService();
  const testExecution = new TestExecutionService(playwrightService);

  const port = options.port || 8931;
  const transport: ServerTransport =
    options.transport === "http" ? new HttpTransport({ port }) : new HttpTransport({ port });

  // Define resources
  const resources: ResourceDefinition[] = [
    {
      name: "reports",
      description: "Fetch test execution reports",
      parameters: z.object({
        reportId: z.string().describe("The ID of the report to retrieve"),
        type: z
          .enum(["test-results", "error-report"])
          .describe("Type of report to retrieve (test results or error report)"),
      }),
      handler: async (params: MCPTypes.GetReportParams) => {
        try {
          const report = await testExecution.getReport(params.reportId, params.type);
          return {
            report,
          };
        } catch (error) {
          console.error("Error fetching report:", error);
          return {
            error: error instanceof Error ? error.message : "Unknown error fetching report",
          };
        }
      },
    },
    {
      name: "api-specs",
      description: "Retrieve API specifications",
      parameters: z.object({
        specId: z
          .string()
          .optional()
          .describe("The ID of the API spec to retrieve. If not provided, returns a list of available specs"),
      }),
      handler: async (params: { specId?: string }) => {
        try {
          // This is a placeholder - you'd implement a real API spec retrieval
          return {
            specs: [
              {
                id: "example-api",
                name: "Example API",
                description: "An example API specification",
              },
            ],
          };
        } catch (error) {
          console.error("Error retrieving API specs:", error);
          return {
            error: error instanceof Error ? error.message : "Unknown error retrieving API specs",
          };
        }
      },
    },
    {
      name: "test-cases",
      description: "Retrieve test cases",
      parameters: z.object({
        testSuiteId: z.string().describe("The ID of the test suite to retrieve"),
      }),
      handler: async (params: MCPTypes.GetTestCasesParams) => {
        try {
          const testSuite = await testGenerator.getTestCases(params.testSuiteId);
          return {
            testSuite,
          };
        } catch (error) {
          console.error("Error retrieving test cases:", error);
          return {
            error: error instanceof Error ? error.message : "Unknown error retrieving test cases",
          };
        }
      },
    },
  ];

  // Define tools
  const tools: ToolDefinition[] = [
    {
      name: "clone-repository",
      description: "Clone a Git repository for testing",
      parameters: z.object({
        url: z.string().describe("URL of the Git repository"),
        branch: z.string().optional().describe("Branch to checkout"),
        depth: z.number().optional().describe("Depth of the clone"),
        credentials: z
          .object({
            username: z.string(),
            password: z.string(),
          })
          .optional()
          .describe("Git credentials if needed"),
      }),
      handler: async (params: MCPTypes.CloneRepositoryParams) => {
        try {
          const result = await gitService.cloneRepository({
            url: params.url,
            branch: params.branch,
            depth: params.depth,
            credentials: params.credentials,
          });

          return {
            success: true,
            projectPath: result,
          };
        } catch (error) {
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
      description: "Use a local project for testing",
      parameters: z.object({
        projectPath: z.string().describe("Path to the local project"),
      }),
      handler: async (params: MCPTypes.UseLocalProjectParams) => {
        try {
          const result = await gitService.useLocalProject(params.projectPath);

          return {
            success: true,
            projectPath: result,
          };
        } catch (error) {
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
      description: "Launch a browser for testing",
      parameters: z.object({
        browserType: z.enum(["chromium", "firefox", "webkit"]).optional().describe("Type of browser to launch"),
        headless: z.boolean().optional().describe("Whether to run browser in headless mode"),
        width: z.number().optional().describe("Browser viewport width"),
        height: z.number().optional().describe("Browser viewport height"),
      }),
      handler: async (params: MCPTypes.LaunchBrowserParams) => {
        try {
          await playwrightService.launchBrowser({
            browserType: params.browserType,
            headless: params.headless,
            width: params.width,
            height: params.height,
          });

          return {
            success: true,
            browserType: params.browserType || "chromium",
          };
        } catch (error) {
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
      description: "Generate test cases from text requirements",
      parameters: z.object({
        requirements: z.string().describe("Text requirements to generate tests from"),
        testType: z.enum(["ui", "api"]).describe("Type of tests to generate"),
        apiSpec: z.string().optional().describe("API specification for API tests"),
      }),
      handler: async (params: MCPTypes.GenerateTestsFromTextParams) => {
        try {
          const result = await testGenerator.generateFromText(params.requirements, params.testType, params.apiSpec);

          if (!result.success) {
            throw new Error(result.error);
          }

          return {
            success: true,
            testSuiteId: result.testSuiteId,
            testSuiteName: result.testSuiteName,
            testCasesCount: result.testCasesCount,
          };
        } catch (error) {
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
      description: "Generate test cases from a document",
      parameters: z.object({
        documentPath: z.string().describe("Path to the document with requirements"),
        testType: z.enum(["ui", "api"]).describe("Type of tests to generate"),
        apiSpec: z.string().optional().describe("API specification for API tests"),
      }),
      handler: async (params: MCPTypes.GenerateTestsFromDocumentParams) => {
        try {
          const result = await testGenerator.generateFromDocument(params.documentPath, params.testType, params.apiSpec);

          if (!result.success) {
            throw new Error(result.error);
          }

          return {
            success: true,
            testSuiteId: result.testSuiteId,
            testSuiteName: result.testSuiteName,
            testCasesCount: result.testCasesCount,
          };
        } catch (error) {
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
      description: "Run tests from a test suite",
      parameters: z.object({
        testSuiteId: z.string().describe("ID of the test suite to run"),
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
            duration: results.duration,
          };
        } catch (error) {
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
      description: "Generate and run API tests",
      parameters: z.object({
        apiSpecPath: z.string().describe("Path to API specification file"),
        endpoints: z.array(z.string()).optional().describe("Specific endpoints to test"),
        methods: z.array(z.string()).optional().describe("Specific HTTP methods to test"),
        generateForAll: z.boolean().optional().describe("Generate tests for all endpoints if true"),
      }),
      handler: async (params: MCPTypes.ApiTestParams) => {
        try {
          // This is a placeholder - you'd implement real API testing
          return {
            success: true,
            testSuiteId: "api-test-suite-id",
            endpointsCovered: ["GET /users", "POST /users"],
            testCasesCount: 10,
          };
        } catch (error) {
          console.error("Error running API tests:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error running API tests",
          };
        }
      },
    },
  ];

  // Create and return the server
  return createServer({
    transport,
    resources,
    tools,
  });
}

// If this file is run directly
if (require.main === module) {
  const server = createMCPServer({
    transport: "http",
  });
  server.start().catch(console.error);
}
