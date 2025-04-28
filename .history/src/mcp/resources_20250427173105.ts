/**
 * MCP Resource Manager
 *
 * Manages the resources available through the MCP server.
 */

import { PlaywrightMCPTestSDK } from '../index';
import { MCPResource } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a resource manager for the MCP server
 * @param sdk The SDK instance to use
 */
export function createResourceManager(sdk: PlaywrightMCPTestSDK) {
  const resources = new Map<string, MCPResource>();

  /**
   * Register a resource with the manager
   * @param resource The resource to register
   */
  function registerResource(resource: MCPResource): void {
    if (resources.has(resource.id)) {
      console.warn(`Resource with ID ${resource.id} already exists. Overwriting.`);
    }
    resources.set(resource.id, resource);
  }

  /**
   * Get a resource by ID
   * @param id The ID of the resource to get
   */
  function getResourceDefinition(id: string): MCPResource | undefined {
    return resources.get(id);
  }

  /**
   * List all registered resources
   */
  function listResources(): MCPResource[] {
    return Array.from(resources.values()).map(({ retrieve, ...resourceDef }) => ({
      ...resourceDef
    })) as any;
  }

  /**
   * Retrieve a resource
   * @param id The ID of the resource to retrieve
   * @param parameters The parameters to pass to the resource
   */
  async function getResource(id: string, parameters: Record<string, any> = {}): Promise<any> {
    const resource = resources.get(id);

    if (!resource) {
      throw new Error(`Resource '${id}' not found`);
    }

    try {
      return await resource.retrieve(parameters);
    } catch (error) {
      console.error(`Error retrieving resource '${id}':`, error);
      throw error;
    }
  }

  /**
   * Register the core resources
   */
  function registerCoreResources(): void {
    // Test cases resource
    registerResource({
      id: 'test_cases',
      description: 'Access test cases',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filter criteria for test cases'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of test cases to return'
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination'
          }
        }
      },
      retrieve: async (parameters) => {
        // This is a placeholder implementation
        // In a real implementation, we would retrieve test cases from a store

        // Return an empty array if no test cases are available
        return {
          testCases: []
        };
      }
    });

    // Test results resource
    registerResource({
      id: 'test_results',
      description: 'Access test results',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filter criteria for test results'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of test results to return'
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination'
          }
        }
      },
      retrieve: async (parameters) => {
        // This is a placeholder implementation
        // In a real implementation, we would retrieve test results from a store

        // Return an empty array if no test results are available
        return {
          testResults: []
        };
      }
    });

    // Error reports resource
    registerResource({
      id: 'error_reports',
      description: 'Access error reports',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filter criteria for error reports'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of error reports to return'
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination'
          }
        }
      },
      retrieve: async (parameters) => {
        // This is a placeholder implementation
        // In a real implementation, we would retrieve error reports from a store

        // Return an empty array if no error reports are available
        return {
          errorReports: []
        };
      }
    });

    // Browser info resource
    registerResource({
      id: 'browser_info',
      description: 'Get information about the browser instance',
      parameters: {
        type: 'object',
        properties: {}
      },
      retrieve: async () => {
        // Get browser information from the SDK
        const browser = sdk.getBrowser?.() || null;

        if (!browser) {
          return {
            status: 'not_launched',
            info: null
          };
        }

        return {
          status: 'launched',
          info: {
            browserType: browser.browserType,
            version: await browser.version()
          }
        };
      }
    });

    // API endpoints resource
    registerResource({
      id: 'api_endpoints',
      description: 'Access API endpoints from parsed API specifications',
      parameters: {
        type: 'object',
        properties: {
          specPath: {
            type: 'string',
            description: 'Path to the API specification file'
          },
          filter: {
            type: 'object',
            description: 'Filter criteria for API endpoints'
          }
        }
      },
      retrieve: async (parameters) => {
        const { specPath } = parameters;

        if (!specPath) {
          throw new Error('specPath is required');
        }

        // Check if the file exists
        if (!fs.existsSync(specPath)) {
          throw new Error(`Specification file not found: ${specPath}`);
        }

        // This is a simplified implementation
        // In a real implementation, we would parse the API specification and return the endpoints

        // Read the specification file
        const specContent = fs.readFileSync(specPath, 'utf-8');

        // Parse the specification based on the file extension
        const ext = path.extname(specPath).toLowerCase();

        let spec;
        if (ext === '.json') {
          try {
            spec = JSON.parse(specContent);
          } catch (error) {
            throw new Error('Invalid JSON specification file');
          }
        } else if (ext === '.yaml' || ext === '.yml') {
          // This is a placeholder for YAML parsing
          // In a real implementation, we would use a YAML parser
          throw new Error('YAML parsing not implemented');
        } else {
          throw new Error(`Unsupported specification file format: ${ext}`);
        }

        // Extract endpoints from the specification
        // This is a simplified implementation
        const endpoints = [];

        // Return the endpoints
        return {
          endpoints
        };
      }
    });

    // Server status resource
    registerResource({
      id: 'server_status',
      description: 'Get MCP server status information',
      parameters: {
        type: 'object',
        properties: {}
      },
      retrieve: async () => {
        const browser = sdk.getBrowser?.() || null;

        return {
          status: 'running',
          version: '1.0.0',
          browser: browser ? {
            status: 'launched',
            type: browser.browserType,
            version: await browser.version()
          } : {
            status: 'not_launched'
          },
          uptime: process.uptime()
        };
      }
    });
  }

  return {
    registerResource,
    getResourceDefinition,
    listResources,
    getResource,
    registerCoreResources
  };
}
