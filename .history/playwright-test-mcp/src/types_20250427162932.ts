/**
 * Core SDK types and interfaces
 */

// SDK Configuration Options
export interface SDKOptions {
  gitOptions?: GitOptions;
  browserOptions?: BrowserOptions;
  testGenerationOptions?: TestGenerationOptions;
  reportingOptions?: ReportingOptions;
  mcpOptions?: MCPOptions;
}

// Git Module Options
export interface GitOptions {
  credentials?: GitCredentials;
  branch?: string;
  depth?: number;
}

export interface GitCredentials {
  username?: string;
  password?: string;
  sshKey?: string;
}

// Browser Module Options
export interface BrowserOptions {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

// MCP Specific Options
export interface MCPOptions {
  port?: number;
  visionMode?: boolean;
  transport?: 'http' | 'sse' | 'ws';
}

// Test Generation Options
export interface TestGenerationOptions {
  promptTemplate?: string;
  maxTestCases?: number;
  includeScreenshots?: boolean;
  screenshotOnFailure?: boolean;
}

// Reporting Options
export interface ReportingOptions {
  outputFormat?: 'json' | 'html' | 'markdown';
  outputPath?: string;
  includeScreenshots?: boolean;
  includeConsoleMessages?: boolean;
  includeNetworkRequests?: boolean;
}

// Test Case Structure
export interface TestCase {
  id: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  action: 'navigate' | 'click' | 'fill' | 'check' | 'select' | 'custom';
  target?: string;
  value?: string;
  customScript?: string;
}

// Test Results Structure
export interface TestResults {
  passed: boolean;
  testCases: TestCaseResult[];
  networkRequests: NetworkRequest[];
  consoleMessages: ConsoleMessage[];
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  duration: number;
  errors?: Error[];
  screenshots?: string[];
}

// Network Monitoring Types
export interface NetworkRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  postData?: string;
  timestamp: number;
  requestId?: string;
  type?: string;
  response?: NetworkResponse;
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  mimeType?: string;
  timestamp?: number;
  body?: string;
}

// Console Monitoring Types
export interface ConsoleMessage {
  type: string;
  text: string;
  location?: { url: string; lineNumber: number; columnNumber: number };
  timestamp: string;
  stack?: string;
}

// Error Reporting Types
export interface ErrorReport {
  frontendErrors: FrontendError[];
  backendErrors: BackendError[];
  summary: string;
}

export interface FrontendError {
  message: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  stack?: string;
  timestamp: string;
  screenshot?: string;
}

export interface BackendError {
  apiEndpoint: string;
  method: string;
  status: number;
  statusText: string;
  requestPayload?: any;
  responseBody?: any;
  timestamp: string;
}

// Main SDK Interface
export interface PlaywrightTestSDK {
  // Configuration
  configure(options: SDKOptions): PlaywrightTestSDK;

  // Git operations
  cloneRepository(url: string, credentials?: GitCredentials): Promise<void>;
  useLocalProject(path: string): Promise<void>;

  // Browser operations
  launchBrowser(options?: BrowserOptions): Promise<void>;
  setupMCPServer(): Promise<void>;
  startFrontendProject(): Promise<void>;

  // Test generation
  generateTestsFromRequirements(requirementsText: string): Promise<TestCase[]>;
  generateTestsFromDocument(documentPath: string): Promise<TestCase[]>;

  // Test execution
  runTests(testCases: TestCase[]): Promise<TestResults>;

  // Debug information
  captureNetworkRequests(): Promise<NetworkRequest[]>;
  captureConsoleMessages(): Promise<ConsoleMessage[]>;

  // Reporting
  generateErrorReport(): Promise<ErrorReport>;

  // Cleanup
  close(): Promise<void>;
}
