/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: Core type definitions for Playwright MCP
 */

// Browser related types
export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  waitForInitialPage?: boolean;
  defaultNavigationTimeout?: number;
}

// Git related types
export interface GitOptions {
  repository: string;
  branch?: string;
  directory?: string;
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };
}

// Test generation related types
export interface TestGenerationOptions {
  url: string;
  scenario?: string;
  customInstructions?: string;
  maxSteps?: number;
}

// API testing related types
export interface ApiTestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  assertions?: ApiAssertion[];
}

export interface ApiAssertion {
  type: 'status' | 'header' | 'body' | 'jsonPath' | 'responseTime';
  path?: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'matches';
  value: any;
}

// Test execution related types
export interface TestExecutionOptions {
  testId: string;
  environment?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// Test report types
export interface TestReport {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  startTime: string;
  endTime: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  steps: TestStep[];
  screenshots: string[];
  error?: string;
}

export interface TestStep {
  id: string;
  description: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  screenshot?: string;
}

// Network request types
export interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  response?: NetworkResponse;
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  contentType?: string;
}

// Local project options
export interface LocalProjectOptions {
  directory: string;
}
