import { TestSuite, TestReport as TestResults, TestStep as ErrorReport } from './core';

export namespace MCPTypes {
  export interface CloneRepositoryParams {
    url: string;
    branch?: string;
    depth?: number;
    credentials?: {
      username: string;
      password: string;
    };
  }

  export interface UseLocalProjectParams {
    projectPath: string;
  }

  export interface LaunchBrowserParams {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    width?: number;
    height?: number;
  }

  export interface GenerateTestsFromTextParams {
    requirements: string;
    testType: 'ui' | 'api';
    apiSpec?: string;
  }

  export interface GenerateTestsFromDocumentParams {
    documentPath: string;
    testType: 'ui' | 'api';
    apiSpec?: string;
  }

  export interface RunTestsParams {
    testSuiteId: string;
  }

  export interface GetTestCasesParams {
    testSuiteId: string;
  }

  export interface GetReportParams {
    reportId: string;
    type: 'test-results' | 'error-report';
  }

  export interface ApiTestParams {
    apiSpecPath: string;
    endpoints?: string[];
    methods?: string[];
    generateForAll?: boolean;
  }

  export interface CloneRepositoryResult {
    success: boolean;
    projectPath?: string;
    error?: string;
  }

  export interface UseLocalProjectResult {
    success: boolean;
    projectPath?: string;
    error?: string;
  }

  export interface LaunchBrowserResult {
    success: boolean;
    browserType?: string;
    error?: string;
  }

  export interface GenerateTestsResult {
    success: boolean;
    testSuiteId?: string;
    testSuiteName?: string;
    testCasesCount?: number;
    error?: string;
  }

  export interface RunTestsResult {
    success: boolean;
    reportId?: string;
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    duration?: number;
    error?: string;
  }

  export interface GetTestCasesResult {
    success: boolean;
    testSuite?: TestSuite;
    error?: string;
  }

  export interface GetReportResult {
    success: boolean;
    report?: TestResults | ErrorReport;
    error?: string;
  }

  export interface ApiTestResult {
    success: boolean;
    testSuiteId?: string;
    endpointsCovered?: string[];
    testCasesCount?: number;
    error?: string;
  }
}
