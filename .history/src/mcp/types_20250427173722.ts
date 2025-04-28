/**
 * Type definitions for the MCP server implementation
 */

// Import actual types available in the types.ts file
import { APITestCase, APIResponse } from "../types";

// Define locally required types that don't exist in ../types
export interface SDKOptions {
  gitOptions?: any;
  browserOptions?: any;
  testGenerationOptions?: any;
  reportingOptions?: any;
  mcpOptions?: any;
  apiTestingOptions?: any;
}

export interface TestCase {
  id: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  id: string;
  description: string;
  action: string;
  target?: string;
  value?: string;
}

/**
 * MCP Server transport type
 */
export type MCPTransport = "http" | "ws" | "sse";

/**
 * MCP Server configuration options
 */
export interface MCPServerOptions {
  /**
   * Port to run the server on
   * @default 8931
   */
  port?: number;

  /**
   * Enable CORS for all requests
   * @default true
   */
  enableCors?: boolean;

  /**
   * Enable request logging
   * @default true
   */
  enableLogging?: boolean;

  /**
   * Path to static files to serve
   */
  staticPath?: string;

  /**
   * Transport mechanisms to enable
   * @default ['http']
   */
  transport?: MCPTransport[];

  /**
   * Additional tools to register
   */
  additionalTools?: MCPTool[];

  /**
   * Additional resources to register
   */
  additionalResources?: MCPResource[];

  /**
   * SDK options to use for initializing the SDK
   */
  sdkOptions?: SDKOptions;

  /**
   * Enable LLM integration for generating test cases
   * @default false
   */
  enableLLM?: boolean;

  /**
   * LLM configuration options
   */
  llmOptions?: LLMOptions;
}

/**
 * LLM configuration options
 */
export interface LLMOptions {
  /**
   * LLM provider to use
   * @default 'openai'
   */
  provider?: "openai" | "azure" | "anthropic" | "local";

  /**
   * API key for the LLM provider
   */
  apiKey?: string;

  /**
   * API endpoint for the LLM provider
   */
  apiEndpoint?: string;

  /**
   * Model name/ID to use
   * @default 'gpt-4'
   */
  model?: string;

  /**
   * Maximum tokens to generate
   * @default 2048
   */
  maxTokens?: number;

  /**
   * Temperature for generation
   * @default 0.7
   */
  temperature?: number;

  /**
   * Custom prompt templates
   */
  promptTemplates?: Record<string, string>;
}

/**
 * MCP Tool definition
 */
export interface MCPToolDefinition {
  /**
   * Tool name/identifier
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Tool version
   * @default '1.0.0'
   */
  version?: string;

  /**
   * Tool parameter schema in JSON Schema format
   */
  parameters: Record<string, any>;

  /**
   * Tool result schema in JSON Schema format
   */
  resultSchema?: Record<string, any>;
}

/**
 * MCP Tool implementation
 */
export interface MCPTool extends MCPToolDefinition {
  /**
   * Tool execution function
   * @param parameters Tool parameters
   * @param session Session context
   * @returns Tool execution result
   */
  execute: (parameters: Record<string, any>, session: MCPSession) => Promise<any> | any;
}

/**
 * MCP Resource definition
 */
export interface MCPResourceDefinition {
  /**
   * Resource identifier
   */
  id: string;

  /**
   * Resource description
   */
  description: string;

  /**
   * Resource version
   * @default '1.0.0'
   */
  version?: string;

  /**
   * Resource parameter schema in JSON Schema format
   */
  parameters?: Record<string, any>;
}

/**
 * MCP Resource implementation
 */
export interface MCPResource extends MCPResourceDefinition {
  /**
   * Resource retrieval function
   * @param parameters Resource parameters
   * @returns Resource data
   */
  retrieve: (parameters: Record<string, any>) => Promise<any> | any;
}

/**
 * MCP Session information
 */
export interface MCPSession {
  /**
   * Session ID
   */
  id: string;

  /**
   * Session creation timestamp
   */
  createdAt: Date;

  /**
   * Session context data
   */
  context: Record<string, any>;

  /**
   * WebSocket connection (if using WebSocket transport)
   */
  ws?: any;
}

/**
 * Test generation request
 */
export interface TestGenerationRequest {
  /**
   * Test generation source
   */
  source: "text" | "document" | "url" | "code";

  /**
   * Source content (requirements text, file path, URL, or code)
   */
  content: string;

  /**
   * Test type to generate
   */
  testType: "ui" | "api" | "auto";

  /**
   * Additional options for test generation
   */
  options?: Record<string, any>;
}

/**
 * Test execution request
 */
export interface TestExecutionRequest {
  /**
   * Test cases to execute
   */
  testCases: TestCase[] | APITestCase[];

  /**
   * Test execution options
   */
  options?: Record<string, any>;
}

/**
 * MCP error response
 */
export interface MCPErrorResponse {
  /**
   * Error message
   */
  error: string;

  /**
   * Error details
   */
  details?: any;

  /**
   * Error code
   */
  code?: string;
}

/**
 * MCP success response
 */
export interface MCPSuccessResponse<T = any> {
  /**
   * Response data
   */
  result: T;
}

/**
 * MCP response (either success or error)
 */
export type MCPResponse<T = any> = MCPSuccessResponse<T> | MCPErrorResponse;
