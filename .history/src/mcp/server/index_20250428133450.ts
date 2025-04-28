/**
 * @file MCP Server for Playwright Testing
 * @version 0.1.0
 * @author MCP Playwright Test Team
 * @date 2023-07-01
 * @description Server implementation for Model Context Protocol (MCP) Playwright testing
 */

import { Server, HTTPTransport, z, createTool, createResource } from "@modelcontextprotocol/sdk";
import path from "path";
import { GitService } from "../services/git-service";
import { PlaywrightService } from "../services/playwright-service";
import { TestGeneratorService } from "../services/test-generator-service";
import { TestExecutionService } from "../services/test-execution-service";
import { ApiTestingService } from "../services/api-testing-service";
import {
  GitOptions,
  LocalProjectOptions,
  BrowserOptions,
  TestGenerationOptions,
  TestExecutionOptions,
  ApiTestOptions,
} from "../types/core";

/**
 * Creates and configures an MCP server for Playwright testing
 * @param options Server configuration options
 * @returns Configured MCP server instance
 */
export default function createMCPServer(options: { port?: number } = {}) {
  // Initialize services
  const gitService = new GitService();
  const playwrightService = new PlaywrightService();
  const testGenerator = new TestGeneratorService();
  const testExecution = new TestExecutionService(playwrightService);
  const apiTesting = new ApiTestingService();

  // Create server with name and version
  const server = new Server({
    name: "mcp-playwright-test",
    version: "0.1.0",
    description: "MCP Server for Playwright Testing",
    port: options.port || 3000,
  });

  // Register tools
  const tools = createTools(gitService, playwrightService, testGenerator, testExecution, apiTesting);
  tools.forEach((tool) => server.registerTool(tool));

  // Register resources
  const resources = createResources(testExecution, apiTesting, testGenerator);
  resources.forEach((resource) => server.registerResource(resource));

  // Add HTTP transport
  const transport = new HTTPTransport();
  server.addTransport(transport);

  return server;
}

/**
 * Creates tool definitions for the MCP server
 */
function createTools(
  gitService: GitService,
  playwrightService: PlaywrightService,
  testGenerator: TestGeneratorService,
  testExecution: TestExecutionService,
  apiTesting: ApiTestingService
) {
  return [
    // Git repository cloning tool
    createTool(
      {
        name: "clone-repository",
        description: "Clone a Git repository to be used for testing",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the Git repository to clone",
            },
            branch: {
              type: "string",
              description: "Branch to checkout",
            },
            username: {
              type: "string",
              description: "Git username for authentication",
            },
            password: {
              type: "string",
              description: "Git password or token for authentication",
            },
            depth: {
              type: "number",
              description: "Depth of git clone, to limit history",
            },
          },
          required: ["url"],
        },
      },
      async (params: GitOptions) => {
        try {
          const projectPath = await gitService.cloneRepository(params);
          return {
            success: true,
            projectPath,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

    // Local project tool
    createTool(
      {
        name: "use-local-project",
        description: "Use a local project directory for testing",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the local project directory",
            },
          },
          required: ["path"],
        },
      },
      async (params: LocalProjectOptions) => {
        try {
          // Validate project path
          const projectPath = path.resolve(params.path);
          return {
            success: true,
            projectPath,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

    // Browser launch tool
    createTool(
      {
        name: "launch-browser",
        description: "Launch a browser for testing",
        parameters: {
          type: "object",
          properties: {
            browserType: {
              type: "string",
              description: "Type of browser to launch (chrome, firefox, webkit)",
              enum: ["chrome", "firefox", "webkit"],
            },
            headless: {
              type: "boolean",
              description: "Whether to run in headless mode",
            },
            slowMo: {
              type: "number",
              description: "Slow down operations by specified milliseconds",
            },
            width: {
              type: "number",
              description: "Browser viewport width",
            },
            height: {
              type: "number",
              description: "Browser viewport height",
            },
          },
          required: ["browserType"],
        },
      },
      async (params: BrowserOptions) => {
        try {
          const browser = await playwrightService.launchBrowser(params);
          return {
            success: true,
            browserId: browser.id,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

    // Generate test cases tool
    createTool(
      {
        name: "generate-test-cases",
        description: "Generate test cases based on project code",
        parameters: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the project for which tests should be generated",
            },
            testType: {
              type: "string",
              description: "Type of tests to generate (ui or api)",
              enum: ["ui", "api"],
            },
            targetUrl: {
              type: "string",
              description: "Target URL for running tests",
            },
            testCount: {
              type: "number",
              description: "Number of test cases to generate",
            },
          },
          required: ["projectPath", "testType"],
        },
      },
      async (params: TestGenerationOptions) => {
        try {
          const results = await testGenerator.generateTestCases(params);
          return {
            success: true,
            testCases: results.testCases,
            testSuiteId: results.testSuiteId,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

    // Execute UI tests tool
    createTool(
      {
        name: "execute-ui-tests",
        description: "Execute UI tests using Playwright",
        parameters: {
          type: "object",
          properties: {
            testSuiteId: {
              type: "string",
              description: "ID of the test suite to execute",
            },
            browserId: {
              type: "string",
              description: "ID of the browser to use for testing",
            },
            baseUrl: {
              type: "string",
              description: "Base URL for the application under test",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds for test execution",
            },
          },
          required: ["testSuiteId", "browserId"],
        },
      },
      async (params: TestExecutionOptions) => {
        try {
          const reportId = await testExecution.executeTests(params);
          return {
            success: true,
            reportId,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),

    // Execute API tests tool
    createTool(
      {
        name: "execute-api-tests",
        description: "Execute API tests",
        parameters: {
          type: "object",
          properties: {
            testSuiteId: {
              type: "string",
              description: "ID of the API test suite to execute",
            },
            baseUrl: {
              type: "string",
              description: "Base URL for the API under test",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds for test execution",
            },
            headers: {
              type: "object",
              description: "HTTP headers to include with all requests",
            },
          },
          required: ["testSuiteId"],
        },
      },
      async (params: ApiTestOptions) => {
        try {
          const reportId = await apiTesting.executeTests(params);
          return {
            success: true,
            reportId,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    ),
  ];
}

/**
 * Creates resource definitions for the MCP server
 */
function createResources(
  testExecution: TestExecutionService,
  apiTesting: ApiTestingService,
  testGenerator: TestGeneratorService
) {
  return [
    // Test execution report resource
    createResource(
      {
        name: "get-test-report",
        description: "Get the test execution report",
        parameters: {
          type: "object",
          properties: {
            reportId: {
              type: "string",
              description: "ID of the test report to retrieve",
            },
          },
          required: ["reportId"],
        },
      },
      async (params: { reportId: string }) => {
        try {
          const report = await testExecution.getReport(params.reportId);
          return report;
        } catch (error) {
          throw new Error(`Failed to fetch test report: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    ),

    // API tests report resource
    createResource(
      {
        name: "get-api-test-report",
        description: "Get the API test execution report",
        parameters: {
          type: "object",
          properties: {
            reportId: {
              type: "string",
              description: "ID of the API test report to retrieve",
            },
          },
          required: ["reportId"],
        },
      },
      async (params: { reportId: string }) => {
        try {
          const report = await apiTesting.getReport(params.reportId);
          return report;
        } catch (error) {
          throw new Error(`Failed to fetch API test report: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    ),

    // Test case information resource
    createResource(
      {
        name: "get-test-case",
        description: "Get detailed information about a specific test case",
        parameters: {
          type: "object",
          properties: {
            testSuiteId: {
              type: "string",
              description: "ID of the test suite",
            },
            testCaseId: {
              type: "string",
              description: "ID of the test case to retrieve",
            },
          },
          required: ["testSuiteId", "testCaseId"],
        },
      },
      async (params: { testSuiteId: string; testCaseId: string }) => {
        try {
          const testCase = await testGenerator.getTestCase(params.testSuiteId, params.testCaseId);
          return testCase;
        } catch (error) {
          throw new Error(`Failed to fetch test case: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    ),
  ];
}
