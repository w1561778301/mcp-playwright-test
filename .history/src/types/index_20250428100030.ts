// Git Service Types
export interface GitCredentials {
  username: string;
  password: string;
}

export interface GitRepositoryOptions {
  branch?: string;
  depth?: number;
  credentials?: GitCredentials;
}

// Playwright Service Types
export interface BrowserOptions {
  browserType?: "chromium" | "firefox" | "webkit";
  headless?: boolean;
  width?: number;
  height?: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
}

export interface NetworkResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
}

export interface ConsoleMessageData {
  type: string;
  text: string;
  timestamp: number;
}

// Test Generator Types
export interface TestStep {
  description: string;
  action: string;
  selector?: string;
  value?: string;
  expectedResult?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  createdAt: Date;
}

// Test Execution Types
export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  passed: boolean;
  failedStep?: number;
  errorMessage?: string;
  duration: number;
  screenshotPath?: string;
}

export interface TestResults {
  id: string;
  testSuiteId: string;
  testSuiteName: string;
  results: TestCaseResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  networkRequests: NetworkRequest[];
  consoleMessages: ConsoleMessageData[];
}

export interface FrontendError {
  message: string;
  source: string;
  timestamp: number;
}

export interface BackendError {
  url: string;
  method: string;
  status: number;
  statusText: string;
  timestamp: number;
}

export interface ErrorReport {
  id: string;
  testSuiteId?: string;
  summary: string;
  frontendErrors: FrontendError[];
  backendErrors: BackendError[];
  consoleMessages: ConsoleMessageData[];
  networkRequests: NetworkRequest[];
  timestamp: Date;
}

// MCP Types
export interface ToolResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ResourceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
