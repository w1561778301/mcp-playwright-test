// 接口文档格式
export type DocumentFormat = "openapi" | "swagger" | "postman" | "apifox" | "auto";

// 接口解析选项
export interface APIDocParserOptions {
  format?: DocumentFormat;
  defaultStatusCode?: number;
  generateMockData?: boolean;
  mockDataOptions?: MockDataOptions;
}

// 模拟数据生成选项
export interface MockDataOptions {
  useExamples?: boolean; // 是否使用文档中的示例
  fakerLocale?: string; // faker库的区域设置
  customTemplates?: Record<string, any>; // 自定义数据模板
  rules?: MockDataRule[]; // 自定义规则
}

export interface MockDataRule {
  fieldPattern: string | RegExp; // 字段名模式
  generator: (field: string, schema: any) => any; // 生成器函数
}

// 扩展APITestingOptions
export interface APITestingOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  enableMocking?: boolean;
  mockPort?: number;
  specPath?: string;

  // 新增属性
  docFormat?: DocumentFormat;
  mockDataOptions?: MockDataOptions;
  mockServerType?: "simple" | "msw";
  validateResponses?: boolean; // 是否验证响应与文档一致性
}

// 模拟服务器配置
export interface MockServerConfig {
  port: number;
  type: "simple" | "msw";
  baseUrl: string;
  cors?: boolean;
  delay?: number;
}

// API文档解析结果
export interface ParsedAPIDocument {
  endpoints: APIEndpoint[];
  schemas: Record<string, any>;
  info: {
    title: string;
    version: string;
    description?: string;
  };
}

// API端点信息
export interface APIEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  requestSchema?: any;
  responseSchema?: any;
  requestExamples?: any[];
  responseExamples?: any[];
  testCases?: APITestCase[];
}

// API请求定义
export interface APIRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

// API响应定义
export interface APIResponse {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  data?: any;
  duration?: number;
  timestamp?: string;
}

// API测试用例
export interface APITestCase {
  testCaseId: string;
  name: string;
  description: string;
  request: APIRequest;
  assertions: APIAssertion[];
}

// API断言
export interface APIAssertion {
  type: "status" | "response-time" | "header" | "body" | "schema";
  expected: any;
  message: string;
}

// API测试结果
export interface APITestResult {
  testCaseId: string;
  passed: boolean;
  response?: APIResponse;
  failedAssertions?: APIAssertion[];
  duration?: number;
}
