/**
 * MCP Tool Manager
 *
 * Manages the tools available through the MCP server.
 */

import { PlaywrightMCPTestSDK } from '../index';
import { MCPTool, MCPSession, TestGenerationRequest, TestExecutionRequest } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a tool manager for the MCP server
 * @param sdk The SDK instance to use
 */
export function createToolManager(sdk: PlaywrightMCPTestSDK) {
  const tools = new Map<string, MCPTool>();

  /**
   * Register a tool with the manager
   * @param tool The tool to register
   */
  function registerTool(tool: MCPTool): void {
    if (tools.has(tool.name)) {
      console.warn(`Tool with name ${tool.name} already exists. Overwriting.`);
    }
    tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   * @param name The name of the tool to get
   */
  function getTool(name: string): MCPTool | undefined {
    return tools.get(name);
  }

  /**
   * List all registered tools
   */
  function listTools(): MCPTool[] {
    return Array.from(tools.values()).map(({ execute, ...toolDef }) => ({
      ...toolDef
    })) as any;
  }

  /**
   * Execute a tool
   * @param name The name of the tool to execute
   * @param parameters The parameters to pass to the tool
   * @param session The session context
   */
  async function executeTool(
    name: string,
    parameters: Record<string, any>,
    session: MCPSession
  ): Promise<any> {
    const tool = tools.get(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    try {
      return await tool.execute(parameters, session);
    } catch (error) {
      console.error(`Error executing tool '${name}':`, error);
      throw error;
    }
  }

  /**
   * Register the core tools
   */
  function registerCoreTools(): void {
    // Browser control tools
    registerTool({
      name: 'browser_launch',
      description: 'Launch a browser instance',
      parameters: {
        type: 'object',
        properties: {
          browserType: {
            type: 'string',
            enum: ['chromium', 'firefox', 'webkit'],
            description: 'Browser type to launch'
          },
          headless: {
            type: 'boolean',
            description: 'Whether to run in headless mode'
          },
          slowMo: {
            type: 'number',
            description: 'Slow down operations by the specified amount of milliseconds'
          }
        }
      },
      execute: async (parameters) => {
        await sdk.launchBrowser(parameters);
        return { success: true };
      }
    });

    registerTool({
      name: 'browser_close',
      description: 'Close the browser instance',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        await sdk.close();
        return { success: true };
      }
    });

    registerTool({
      name: 'browser_setup_mcp',
      description: 'Set up the MCP server for browser control',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        await sdk.setupMCPServer();
        return { success: true };
      }
    });

    // Repository management tools
    registerTool({
      name: 'repo_clone',
      description: 'Clone a Git repository',
      parameters: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            description: 'URL of the repository to clone'
          },
          username: {
            type: 'string',
            description: 'Git username for authentication'
          },
          password: {
            type: 'string',
            description: 'Git password or token for authentication'
          }
        }
      },
      execute: async (parameters) => {
        const { url, username, password } = parameters;

        const credentials = username && password ? { username, password } : undefined;

        await sdk.cloneRepository(url, credentials);
        return { success: true };
      }
    });

    registerTool({
      name: 'repo_use_local',
      description: 'Use a local project directory',
      parameters: {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'Path to the local project'
          }
        }
      },
      execute: async (parameters) => {
        const { path } = parameters;
        await sdk.useLocalProject(path);
        return { success: true };
      }
    });

    // Test generation tools
    registerTool({
      name: 'test_generate',
      description: 'Generate test cases from requirements or documentation',
      parameters: {
        type: 'object',
        required: ['request'],
        properties: {
          request: {
            type: 'object',
            description: 'Test generation request',
            required: ['source', 'content', 'testType'],
            properties: {
              source: {
                type: 'string',
                enum: ['text', 'document', 'url', 'code'],
                description: 'Source of test generation'
              },
              content: {
                type: 'string',
                description: 'Content for test generation (text, file path, URL, or code)'
              },
              testType: {
                type: 'string',
                enum: ['ui', 'api', 'auto'],
                description: 'Type of tests to generate'
              },
              options: {
                type: 'object',
                description: 'Additional options for test generation'
              }
            }
          }
        }
      },
      execute: async (parameters) => {
        const request = parameters.request as TestGenerationRequest;

        let testCases: any[] = [];

        switch (request.source) {
          case 'text':
            if (request.testType === 'api') {
              // Generate API tests from text requirements
              testCases = await sdk.generateAPITests!(request.content);
            } else {
              // Generate UI tests from text requirements
              testCases = await sdk.generateTestsFromRequirements(request.content);
            }
            break;

          case 'document':
            if (request.testType === 'api') {
              // Generate API tests from OpenAPI document
              testCases = await sdk.generateAPITests!(request.content);
            } else {
              // Generate UI tests from document
              testCases = await sdk.generateTestsFromDocument(request.content);
            }
            break;

          case 'url':
            // Implement URL fetching and test generation
            throw new Error('URL-based test generation not implemented yet');

          case 'code':
            // Implement code analysis and test generation
            throw new Error('Code-based test generation not implemented yet');

          default:
            throw new Error(`Unknown source type: ${request.source}`);
        }

        return { testCases };
      }
    });

    // Test execution tools
    registerTool({
      name: 'test_execute',
      description: 'Execute test cases',
      parameters: {
        type: 'object',
        required: ['request'],
        properties: {
          request: {
            type: 'object',
            description: 'Test execution request',
            required: ['testCases'],
            properties: {
              testCases: {
                type: 'array',
                description: 'Test cases to execute',
                items: {
                  type: 'object'
                }
              },
              options: {
                type: 'object',
                description: 'Additional options for test execution'
              }
            }
          }
        }
      },
      execute: async (parameters) => {
        const request = parameters.request as TestExecutionRequest;

        let results;

        // Determine if these are UI or API test cases
        const isAPITest = request.testCases.length > 0 &&
          'testCaseId' in request.testCases[0] &&
          'request' in request.testCases[0];

        if (isAPITest) {
          // Execute API tests
          results = await sdk.runAPITests!(request.testCases as any);
        } else {
          // Execute UI tests
          results = await sdk.runTests(request.testCases as any);
        }

        return { results };
      }
    });

    // Reporting tools
    registerTool({
      name: 'report_generate',
      description: 'Generate an error report for test results',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'html', 'markdown'],
            description: 'Output format for the report'
          },
          outputPath: {
            type: 'string',
            description: 'Path to save the report to'
          }
        }
      },
      execute: async (parameters) => {
        const report = await sdk.generateErrorReport();

        // Save the report if an output path is provided
        if (parameters.outputPath) {
          const outputDir = path.dirname(parameters.outputPath);

          // Create the output directory if it doesn't exist
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          fs.writeFileSync(parameters.outputPath, JSON.stringify(report, null, 2));
        }

        return { report };
      }
    });

    // Mock API tools
    registerTool({
      name: 'api_mock',
      description: 'Mock an API endpoint',
      parameters: {
        type: 'object',
        required: ['endpoint', 'method', 'response'],
        properties: {
          endpoint: {
            type: 'string',
            description: 'API endpoint to mock'
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
            description: 'HTTP method for the endpoint'
          },
          response: {
            type: 'object',
            description: 'Response to return for the mock endpoint',
            required: ['status'],
            properties: {
              status: {
                type: 'number',
                description: 'HTTP status code to return'
              },
              data: {
                description: 'Response data to return'
              },
              headers: {
                type: 'object',
                description: 'HTTP headers to include in the response'
              },
              delay: {
                type: 'number',
                description: 'Delay in milliseconds before responding'
              }
            }
          }
        }
      },
      execute: async (parameters) => {
        const { endpoint, method, response } = parameters;

        sdk.mockAPIEndpoint!(endpoint, method, response);

        return { success: true };
      }
    });

    // Debugging tools
    registerTool({
      name: 'debug_capture_network',
      description: 'Capture network requests from the browser',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        const requests = await sdk.captureNetworkRequests();
        return { requests };
      }
    });

    registerTool({
      name: 'debug_capture_console',
      description: 'Capture console messages from the browser',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        const messages = await sdk.captureConsoleMessages();
        return { messages };
      }
    });
  }

  return {
    registerTool,
    getTool,
    listTools,
    executeTool,
    registerCoreTools
  };
}
