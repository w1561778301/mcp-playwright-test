import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { APIDocumentParser, DocumentFormat, ParsedAPIDocument, APIEndpoint } from "./parser";
import { APITestCase, APIAssertion, APIRequest, APIResponse } from "../../types";

/**
 * OpenAPI v3 document parser
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
   * @param filePath Path to the OpenAPI v3 document file
   * @returns Parsed API document
   */
  async parseDocument(filePath: string): Promise<ParsedAPIDocument> {
    const fileContent = fs.readFileSync(filePath, "utf8");
    let document: any;

    // Parse document based on file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".json") {
      document = JSON.parse(fileContent);
    } else if (ext === ".yaml" || ext === ".yml") {
      document = yaml.load(fileContent);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Supported formats: .json, .yaml, .yml`);
    }

    // Verify this is an OpenAPI v3 document
    if (!document.openapi || !document.openapi.startsWith("3.")) {
      throw new Error(`Not an OpenAPI v3 document. Found version: ${document.openapi || "undefined"}`);
    }

    // Extract API document information
    const baseUrl = this.extractBaseUrl(document);
    const endpoints = this.extractEndpoints(document);

    return {
      title: document.info.title || "Untitled API",
      version: document.info.version || "1.0.0",
      description: document.info.description || "",
      baseUrl,
      endpoints,
      schemas: document.components?.schemas || {},
    };
  }

  /**
   * Extract base URL from OpenAPI document
   * @param document OpenAPI document
   * @returns Base URL
   */
  private extractBaseUrl(document: any): string {
    if (!document.servers || document.servers.length === 0) {
      return "http://localhost";
    }

    const server = document.servers[0];
    let url = server.url;

    // Replace any variables with their default values
    if (server.variables) {
      Object.keys(server.variables).forEach((variable) => {
        const variableData = server.variables[variable];
        const defaultValue = variableData.default || "";
        url = url.replace(`{${variable}}`, defaultValue);
      });
    }

    return url;
  }

  /**
   * Extract endpoints from OpenAPI document
   * @param document OpenAPI document
   * @returns Array of API endpoints
   */
  private extractEndpoints(document: any): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // Iterate through each path and its operations
    Object.keys(document.paths || {}).forEach((path) => {
      const pathItem = document.paths[path];

      // Iterate through each HTTP method (operation)
      ["get", "post", "put", "delete", "patch", "options", "head"].forEach((method) => {
        if (pathItem[method]) {
          const operation = pathItem[method];

          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || "",
            description: operation.description || "",
            parameters: this.extractParameters(pathItem, operation),
            requestSchema: this.extractRequestSchema(operation, document),
            responseSchemas: this.extractResponseSchemas(operation, document),
            requestExamples: this.extractRequestExamples(operation, document),
            responseExamples: this.extractResponseExamples(operation, document),
            headers: this.extractHeaders(operation),
          });
        }
      });
    });

    return endpoints;
  }

  /**
   * Extract parameters from operation
   * @param pathItem Path item object
   * @param operation Operation object
   * @returns Parameters by category
   */
  private extractParameters(pathItem: any, operation: any): Record<string, any> {
    const result: Record<string, any> = {
      path: [],
      query: [],
      header: [],
      cookie: [],
    };

    // Combine parameters from path item and operation
    const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];

    // Group parameters by their location (in)
    allParams.forEach((param) => {
      if (param.in && result[param.in]) {
        result[param.in].push({
          name: param.name,
          required: param.required || false,
          schema: param.schema || {},
          description: param.description || "",
        });
      }
    });

    return result;
  }

  /**
   * Extract request schema from operation
   * @param operation Operation object
   * @param document OpenAPI document
   * @returns Request schema
   */
  private extractRequestSchema(operation: any, document: any): Record<string, any> {
    if (!operation.requestBody) {
      return {};
    }

    const result: Record<string, any> = {};
    const requestBody = operation.requestBody;
    const content = requestBody.content || {};

    // Extract schemas for each content type
    Object.keys(content).forEach((contentType) => {
      result[contentType] = this.resolveSchema(content[contentType].schema, document);
    });

    return result;
  }

  /**
   * Extract response schemas from operation
   * @param operation Operation object
   * @param document OpenAPI document
   * @returns Response schemas by status code and content type
   */
  private extractResponseSchemas(operation: any, document: any): Record<string, any> {
    const result: Record<string, any> = {};
    const responses = operation.responses || {};

    // Extract schemas for each status code and content type
    Object.keys(responses).forEach((statusCode) => {
      const response = responses[statusCode];
      const content = response.content || {};

      result[statusCode] = {};
      Object.keys(content).forEach((contentType) => {
        result[statusCode][contentType] = this.resolveSchema(content[contentType].schema, document);
      });
    });

    return result;
  }

  /**
   * Extract request examples from operation
   * @param operation Operation object
   * @param document OpenAPI document
   * @returns Request examples
   */
  private extractRequestExamples(operation: any, document: any): any[] {
    if (!operation.requestBody || !operation.requestBody.content) {
      return [];
    }

    const examples: any[] = [];
    const content = operation.requestBody.content;

    // Extract examples for each content type
    Object.keys(content).forEach((contentType) => {
      const contentTypeObj = content[contentType];

      if (contentTypeObj.examples) {
        Object.keys(contentTypeObj.examples).forEach((exampleName) => {
          const example = contentTypeObj.examples[exampleName];
          examples.push({
            contentType,
            name: exampleName,
            value: example.value || {},
            description: example.description || "",
          });
        });
      } else if (contentTypeObj.example) {
        examples.push({
          contentType,
          name: "default",
          value: contentTypeObj.example,
          description: "",
        });
      }
    });

    return examples;
  }

  /**
   * Extract response examples from operation
   * @param operation Operation object
   * @param document OpenAPI document
   * @returns Response examples by status code
   */
  private extractResponseExamples(operation: any, document: any): any[] {
    const examples: any[] = [];
    const responses = operation.responses || {};

    // Extract examples for each status code and content type
    Object.keys(responses).forEach((statusCode) => {
      const response = responses[statusCode];
      const content = response.content || {};

      Object.keys(content).forEach((contentType) => {
        const contentTypeObj = content[contentType];

        if (contentTypeObj.examples) {
          Object.keys(contentTypeObj.examples).forEach((exampleName) => {
            const example = contentTypeObj.examples[exampleName];
            examples.push({
              statusCode,
              contentType,
              name: exampleName,
              value: example.value || {},
              description: example.description || "",
            });
          });
        } else if (contentTypeObj.example) {
          examples.push({
            statusCode,
            contentType,
            name: "default",
            value: contentTypeObj.example,
            description: "",
          });
        }
      });
    });

    return examples;
  }

  /**
   * Extract headers from operation
   * @param operation Operation object
   * @returns Headers
   */
  private extractHeaders(operation: any): Record<string, any> {
    const result: Record<string, any> = {};

    // Extract headers from parameters
    (operation.parameters || []).forEach((param: any) => {
      if (param.in === "header") {
        result[param.name] = {
          required: param.required || false,
          description: param.description || "",
          schema: param.schema || {},
        };
      }
    });

    return result;
  }

  /**
   * Resolve schema reference
   * @param schema Schema object or reference
   * @param document OpenAPI document
   * @returns Resolved schema
   */
  private resolveSchema(schema: any, document: any): any {
    if (!schema) {
      return {};
    }

    // Resolve schema reference
    if (schema.$ref) {
      const refPath = schema.$ref.replace("#/", "").split("/");
      let resolved = document;

      // Navigate through the reference path
      for (const segment of refPath) {
        if (resolved[segment] === undefined) {
          return {};
        }
        resolved = resolved[segment];
      }

      return this.resolveSchema(resolved, document);
    }

    // Handle array type
    if (schema.type === "array" && schema.items) {
      return {
        type: "array",
        items: this.resolveSchema(schema.items, document),
      };
    }

    // Handle object type with properties
    if (schema.type === "object" && schema.properties) {
      const properties: Record<string, any> = {};

      Object.keys(schema.properties).forEach((propName) => {
        properties[propName] = this.resolveSchema(schema.properties[propName], document);
      });

      return {
        type: "object",
        properties,
        required: schema.required || [],
      };
    }

    // Return the schema as is for simple types
    return schema;
  }

  /**
   * Generate test cases from a parsed API document
   * @param parsedDocument Parsed API document
   * @returns Array of API test cases
   */
  async generateTestCases(parsedDocument: ParsedAPIDocument): Promise<APITestCase[]> {
    const testCases: APITestCase[] = [];

    // Generate test cases for each endpoint
    parsedDocument.endpoints.forEach((endpoint) => {
      // Create a basic test case for the endpoint
      const testCaseId = `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/\//g, "-")}`;

      // Prepare request object
      const request: APIRequest = {
        method: endpoint.method,
        url: `${parsedDocument.baseUrl}${endpoint.path}`,
        headers: {},
        params: {},
        data: null,
      };

      // Prepare assertions
      const assertions: APIAssertion[] = [
        {
          type: "status",
          expected: this.getExpectedStatusCode(endpoint.method),
          message: `Expected status code ${this.getExpectedStatusCode(endpoint.method)}`,
        },
        {
          type: "response-time",
          expected: 2000,
          message: "Response time should be less than 2000ms",
        },
      ];

      // Add content type for appropriate methods
      if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
        if (!request.headers) request.headers = {};
        request.headers["Content-Type"] = "application/json";

        // Try to use examples if available
        if (endpoint.requestExamples && endpoint.requestExamples.length > 0) {
          const example = endpoint.requestExamples[0];
          request.data = example.value;

          if (example.contentType && request.headers) {
            request.headers["Content-Type"] = example.contentType;
          }
        } else if (endpoint.requestSchema) {
          // Use first available schema (simplified)
          const contentTypes = Object.keys(endpoint.requestSchema);
          if (contentTypes.length > 0 && request.headers) {
            request.headers["Content-Type"] = contentTypes[0];
            request.data = {}; // Simplified - would need schema-based sample generation
          }
        }
      }

      // Add schema validation if response schema is available
      if (endpoint.responseSchemas) {
        const successCodes = Object.keys(endpoint.responseSchemas).filter(
          (code) => code.startsWith("2") || code === "default"
        );

        if (successCodes.length > 0) {
          const statusCode = successCodes[0];
          const contentTypes = Object.keys(endpoint.responseSchemas[statusCode] || {});

          if (contentTypes.length > 0) {
            assertions.push({
              type: "schema",
              expected: endpoint.responseSchemas[statusCode][contentTypes[0]],
              message: "Response should match schema",
            });
          }
        }
      }

      // Create the test case
      testCases.push({
        testCaseId,
        name: `Test ${endpoint.method} ${endpoint.path}`,
        description:
          endpoint.description || endpoint.summary || `Verify the ${endpoint.method} ${endpoint.path} endpoint`,
        request,
        assertions,
      });
    });

    return testCases;
  }

  /**
   * Get expected status code based on HTTP method
   * @param method HTTP method
   * @returns Expected status code
   */
  private getExpectedStatusCode(method: string): number {
    switch (method.toUpperCase()) {
      case "POST":
        return 201;
      case "PUT":
      case "PATCH":
      case "DELETE":
      case "GET":
      default:
        return 200;
    }
  }
}
