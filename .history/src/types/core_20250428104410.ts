export namespace CoreTypes {
  export interface GitCredentials {
    username: string;
    password: string;
  }

  export interface GitRepositoryOptions {
    url: string;
    branch?: string;
    depth?: number;
    credentials?: GitCredentials;
  }

  export interface BrowserOptions {
    browserType?: 'chromium' | 'firefox' | 'webkit';
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
    resourceType: string;
  }

  export interface NetworkResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
  }

  export interface ConsoleMessageData {
    type: string;
    text: string;
    timestamp: number;
    location?: {
      url: string;
      lineNumber?: number;
      columnNumber?: number;
    };
  }

  export interface TestStep {
    id: string;
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
    createdAt: number;
  }

  export interface TestStepResult {
    stepId: string;
    success: boolean;
    error?: string;
    screenshot?: string;
    duration: number;
  }

  export interface TestCaseResult {
    testCaseId: string;
    testCaseName: string;
    success: boolean;
    stepResults: TestStepResult[];
    duration: number;
  }

  export interface TestResults {
    id: string;
    testSuiteId: string;
    testSuiteName: string;
    results: TestCaseResult[];
    totalTests: number;
    passedTests: number;
    failedTests: number;
    startTime: number;
    endTime: number;
    duration: number;
    networkRequests: NetworkRequest[];
    consoleMessages: ConsoleMessageData[];
  }

  export interface FrontendError {
    message: string;
    location?: string;
    stack?: string;
    timestamp: number;
    consoleMessage: ConsoleMessageData;
  }

  export interface BackendError {
    url: string;
    method: string;
    status: number;
    statusText: string;
    timestamp: number;
    request: NetworkRequest;
    response?: NetworkResponse;
  }

  export interface ErrorReport {
    id: string;
    testRunId?: string;
    frontendErrors: FrontendError[];
    backendErrors: BackendError[];
    summary: string;
    timestamp: number;
  }
}
