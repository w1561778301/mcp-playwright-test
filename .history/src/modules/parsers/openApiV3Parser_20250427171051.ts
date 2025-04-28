import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  APIDocumentParser,
  DocumentFormat,
  ParsedAPIDocument,
  APIEndpoint,
  APITestCase,
  APIRequest,
  APIAssertion
} from './parser';

/**
 * Parser for OpenAPI v3 specifications
 */
export class OpenApiV3Parser implements APIDocumentParser {
  /**
   * Get supported document formats
   * @returns Array of supported document formats
   */
  getSupportedFormats(): DocumentFormat[] {
    return [DocumentFormat.OPENAPI_V3];
  }

  /**
   * Parse an OpenAPI v3 document
   * @param filePath Path to the OpenAPI specification file
   * @returns Parsed API document
   */
  async parseDocument(filePath: string): Promise<ParsedAPIDocument> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();

      let document: any;
      if (extension === '.json') {
        document = JSON.parse(fileContent);
      } else if (['.yaml', '.yml'].includes(extension)) {
        document = yaml.load(fileContent);
      } else {
        throw new Error(`Unsupported file format: ${extension}. Only JSON and YAML are supported.`);
      }

      // Verify it's an OpenAPI v3 document
      if (!document.openapi || !document.openapi.startsWith('3.')) {
        throw new Error('The document is not an OpenAPI v3 specification');
      }

      const parsedDocument: ParsedAPIDocument = {
        title: document.info.title || 'API Document',
        version: document.info.version || '1.0.0',
        description: document.info.description || '',
        baseUrl: this.extractBaseUrl(document),
        endpoints: this.extractEndpoints(document),
        schemas: document.components?.schemas || {}
      };

      return parsedDocument;
    } catch (error) {
      console.error('Error parsing OpenAPI document:', error);
      throw error;
    }
  }

  /**
   * Extract the base URL from the OpenAPI document
   * @param document OpenAPI document
   * @returns Base URL
   */
  private extractBaseUrl(document: any): string {
    let baseUrl = '';

    // Extract from servers if available
    if (document.servers && document.servers.length > 0) {
      const server = document.servers[0];
      baseUrl = server.url;

      // If server URL contains variables, replace them with defaults
      if (server.variables) {
        Object.entries(server.variables).forEach(([variable, config]: [string, any]) => {
          const defaultValue = config.default;
          if (defaultValue) {
            baseUrl = baseUrl.replace(`{${variable}}`, defaultValue);
          }
        });
      }
    }

    return baseUrl;
  }

  /**
   * Extract endpoints from the OpenAPI document
   * @param document OpenAPI document
   * @returns Array of API endpoints
   */
  private extractEndpoints(document: any): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // Process each path and its operations
    Object.entries(document.paths || {}).forEach(([path, pathItem]: [string, any]) => {
      // Skip non-operation properties
      const operations = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

      operations.forEach(method => {
        if (pathItem[method]) {
          const operation = pathItem[method];

          const endpoint: APIEndpoint = {
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            parameters: this.extractParameters(operation.parameters, pathItem.parameters),
            requestSchema: this.extractRequestSchema(operation),
            responseSchemas: this.extractResponseSchemas(operation.responses),
            requestExamples: this.extractRequestExamples(operation),
            responseExamples: this.extractResponseExamples(operation.responses),
            headers: this.extractHeaders(operation)
          };

          endpoints.push(endpoint);
        }
      });
    });

    return endpoints;
  }

  /**
   * Extract parameters from the operation
   * @param operationParams Operation parameters
   * @param pathParams Path parameters
   * @returns Object with parameter information
   */
  private extractParameters(operationParams: any[] = [], pathParams: any[] = []): Record<string, any> {
    const parameters: Record<string, any> = {
      path: {},
      query: {},
      header: {},
      cookie: {}
    };

    // Combine path and operation parameters
    const allParams = [...(pathParams || []), ...(operationParams || [])];

    allParams.forEach(param => {
      if (!param) return;

      // Handle $ref
      if (param.$ref) {
        // In a complete implementation, we would resolve the reference
        // For simplicity, we're skipping reference resolution
        return;
      }

      const location = param.in;
      if (location && parameters[location]) {
        parameters[location][param.name] = {
          required: param.required || false,
          description: param.description || '',
          schema: param.schema || {}
        };
      }
    });

    return parameters;
  }

  /**
   * Extract request schema from the operation
   * @param operation Operation object
   * @returns Request schema
   */
  private extractRequestSchema(operation: any): Record<string, any> {
    if (!operation.requestBody) return {};

    const content = operation.requestBody.content || {};
    const contentTypes = Object.keys(content);

    if (contentTypes.length === 0) return {};

    // Prefer JSON
    const contentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
    return content[contentType]?.schema || {};
  }

  /**
   * Extract response schemas from the responses
   * @param responses Responses object
   * @returns Object with status codes as keys and schemas as values
   */
  private extractResponseSchemas(responses: any): Record<string, any> {
    const schemas: Record<string, any> = {};

    if (!responses) return schemas;

    Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
      if (!response) return;

      // Handle $ref
      if (response.$ref) {
        // In a complete implementation, we would resolve the reference
        // For simplicity, we're skipping reference resolution
        return;
      }

      const content = response.content || {};
      const contentTypes = Object.keys(content);

      if (contentTypes.length === 0) {
        schemas[statusCode] = {};
        return;
      }

      // Prefer JSON
      const contentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
      schemas[statusCode] = content[contentType]?.schema || {};
    });

    return schemas;
  }

  /**
   * Extract request examples from the operation
   * @param operation Operation object
   * @returns Request examples
   */
  private extractRequestExamples(operation: any): any[] {
    const examples: any[] = [];

    if (!operation.requestBody) return examples;

    const content = operation.requestBody.content || {};
    const contentTypes = Object.keys(content);

    if (contentTypes.length === 0) return examples;

    // Prefer JSON
    const contentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
    const contentTypeObj = content[contentType];

    if (!contentTypeObj) return examples;

    // Extract example
    if (contentTypeObj.example) {
      examples.push(contentTypeObj.example);
    }

    // Extract examples
    if (contentTypeObj.examples) {
      Object.values(contentTypeObj.examples).forEach((ex: any) => {
        if (ex.value) examples.push(ex.value);
      });
    }

    return examples;
  }

  /**
   * Extract response examples from the responses
   * @param responses Responses object
   * @returns Array of response examples
   */
  private extractResponseExamples(responses: any): any[] {
    const examples: any[] = [];

    if (!responses) return examples;

    Object.values(responses).forEach((response: any) => {
      if (!response || response.$ref) return;

      const content = response.content || {};
      const contentTypes = Object.keys(content);

      if (contentTypes.length === 0) return;

      // Prefer JSON
      const contentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
      const contentTypeObj = content[contentType];

      if (!contentTypeObj) return;

      // Extract example
      if (contentTypeObj.example) {
        examples.push(contentTypeObj.example);
      }

      // Extract examples
      if (contentTypeObj.examples) {
        Object.values(contentTypeObj.examples).forEach((ex: any) => {
          if (ex.value) examples.push(ex.value);
        });
      }
    });

    return examples;
  }

  /**
   * Extract headers from the operation
   * @param operation Operation object
   * @returns Object with header information
   */
  private extractHeaders(operation: any): Record<string, any> {
    const headers: Record<string, any> = {};

    // Extract security requirements as headers
    if (operation.security && operation.security.length > 0) {
      operation.security.forEach((requirement: any) => {
        Object.keys(requirement).forEach(name => {
          headers[name] = {
            type: 'security',
            required: true
          };
        });
      });
    }

    return headers;
  }

  /**
   * Generate test cases from a parsed API document
   * @param parsedDocument Parsed API document
   * @returns Array of API test cases
   */
  async generateTestCases(parsedDocument: ParsedAPIDocument): Promise<APITestCase[]> {
    const testCases: APITestCase[] = [];

    parsedDocument.endpoints.forEach((endpoint, index) => {
      // Create a basic test case for each endpoint
      const testCaseId = `test-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/\//g, '-').replace(/[{}]/g, '').replace(/-$/, '')}`;

      const request: APIRequest = {
        method: endpoint.method,
        url: `${parsedDocument.baseUrl}${endpoint.path}`,
        headers: {},
        params: {},
        data: {}
      };

      // Add basic assertions
      const assertions: APIAssertion[] = [
        {
          type: 'status',
          value: this.getExpectedStatusCode(endpoint.method),
          description: `Response status code should be ${this.getExpectedStatusCode(endpoint.method)}`
        },
        {
          type: 'responseTime',
          value: 5000,
          description: 'Response time should be less than 5000ms'
        }
      ];

      // If there's a response schema for successful status codes, add a JSON schema validation assertion
      if (endpoint.responseSchemas['200'] || endpoint.responseSchemas['201'] || endpoint.responseSchemas['2XX']) {
        assertions.push({
          type: 'schema',
          value: endpoint.responseSchemas['200'] || endpoint.responseSchemas['201'] || endpoint.responseSchemas['2XX'],
          description: 'Response should match the JSON schema'
        });
      }

      // If there are example responses, add a property assertion
      if (endpoint.responseExamples && endpoint.responseExamples.length > 0) {
        const example = endpoint.responseExamples[0];
        if (typeof example === 'object' && example !== null) {
          // Add assertions for the first level properties
          Object.keys(example).forEach(key => {
            assertions.push({
              type: 'property',
              property: key,
              value: 'exists',
              description: `Response should contain property ${key}`
            });
          });
        }
      }

      // Create the test case
      const testCase: APITestCase = {
        testCaseId,
        description: endpoint.summary || `Test ${endpoint.method} ${endpoint.path}`,
        request,
        assertions,
        enabled: true
      };

      testCases.push(testCase);
    });

    return testCases;
  }

  /**
   * Get the expected status code based on the HTTP method
   * @param method HTTP method
   * @returns Expected status code
   */
  private getExpectedStatusCode(method: string): number {
    switch (method.toUpperCase()) {
      case 'POST':
        return 201;
      case 'DELETE':
        return 204;
      default:
        return 200;
    }
  }
}
