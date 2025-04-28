import axios, { AxiosRequestConfig } from "axios";
import * as fs from "fs";
import * as path from "path";
import { APIRequest, APIResponse, APITestCase, APITestResult, APIAssertion, APITestingOptions } from "../types";
import { ParserFactory, DocumentFormat } from '../modules/parsers';
import { DataGeneratorFactory } from "./mockGenerators/DataGeneratorFactory";
import { SchemaBasedGenerator } from "./mockGenerators/SchemaBasedGenerator";
import { ExampleBasedGenerator } from "./mockGenerators/ExampleBasedGenerator";

/**
 * API测试模块用于执行API测试和模拟API响应
 */
export class APITestingModule {
  private options: APITestingOptions;
  private requests: APIRequest[] = [];
  private mockEndpoints: Map<string, APIResponse> = new Map();
  private mockServer: any = null;
  private parserFactory: ParserFactory;
  private dataGeneratorFactory: DataGeneratorFactory;

  constructor(options: APITestingOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || "http://localhost:3000",
      timeout: options.timeout || 10000,
      headers: options.headers || {},
      enableMocking: options.enableMocking || false,
      mockPort: options.mockPort || 8080,
      specPath: options.specPath || "",
      mockDataOptions: options.mockDataOptions || { locale: "zh_CN" }
    };

    // 初始化解析器工厂和数据生成器工厂
    this.parserFactory = ParserFactory.getInstance();
    this.dataGeneratorFactory = DataGeneratorFactory.getInstance();

    // 如果启用了模拟，启动模拟服务器
    if (this.options.enableMocking) {
      this.startMockServer();
    }
  }

  /**
   * 从请求路径和方法生成唯一键
   */
  private getMockKey(endpoint: string, method: string): string {
    return `${method.toUpperCase()}:${endpoint}`;
  }

  /**
   * 启动API模拟服务器
   */
  private startMockServer(): void {
    // 简单实现，实际项目可能需要使用express或其他HTTP服务器
    if (this.mockServer) return;

    const http = require("http");
    this.mockServer = http.createServer((req: any, res: any) => {
      // 获取请求路径和方法
      const url = req.url;
      const method = req.method;
      const key = this.getMockKey(url, method);

      // 检查是否有匹配的模拟响应
      if (this.mockEndpoints.has(key)) {
        const mockResponse = this.mockEndpoints.get(key)!;

        // 设置状态码和头信息
        res.statusCode = mockResponse.status;
        if (mockResponse.headers) {
          Object.entries(mockResponse.headers).forEach(([name, value]) => {
            res.setHeader(name, value);
          });
        }

        // 返回模拟的响应体
        res.end(typeof mockResponse.body === "string" ? mockResponse.body : JSON.stringify(mockResponse.body));
      } else {
        // 如果没有匹配的模拟，返回404
        res.statusCode = 404;
        res.end("Not Found");
      }
    });

    this.mockServer.listen(this.options.mockPort, () => {
      console.log(`API模拟服务器运行在端口 ${this.options.mockPort}`);
    });
  }

  /**
   * 停止API模拟服务器
   */
  stopMockServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mockServer) {
        resolve();
        return;
      }

      this.mockServer.close((err: Error) => {
        if (err) reject(err);
        else {
          this.mockServer = null;
          resolve();
        }
      });
    });
  }

  /**
   * 添加API模拟端点
   */
  mockAPIEndpoint(endpoint: string, method: string, response: APIResponse): void {
    const key = this.getMockKey(endpoint, method);
    this.mockEndpoints.set(key, response);
  }

  /**
   * 清除所有API模拟
   */
  clearMocks(): void {
    this.mockEndpoints.clear();
  }

  /**
   * 记录API请求
   */
  recordRequest(request: APIRequest, response: APIResponse): void {
    this.requests.push({
      ...request,
      response,
    });
  }

  /**
   * 获取记录的API请求
   */
  getRecordedRequests(): APIRequest[] {
    return this.requests;
  }

  /**
   * 从API规范生成测试用例
   * @param specPath API规范文件路径
   * @param format 规范格式，可以是'openapi'、'swagger'、'postman'或'apifox'
   */
  async generateAPITestsFromSpec(specPath: string = "", format: string = "openapi"): Promise<APITestCase[]> {
    const specFilePath = specPath || this.options.specPath;
    if (!specFilePath) {
      throw new Error("未提供API规范路径");
    }

    if (!fs.existsSync(specFilePath)) {
      throw new Error(`API规范文件不存在: ${specFilePath}`);
    }

    try {
      // 将format字符串转换为DocumentFormat枚举
      let docFormat: DocumentFormat;
      switch (format.toLowerCase()) {
        case 'openapi':
        case 'openapi-v3':
          docFormat = DocumentFormat.OPENAPI_V3;
          break;
        case 'swagger':
        case 'openapi-v2':
          docFormat = DocumentFormat.OPENAPI_V2;
          break;
        case 'postman':
          docFormat = DocumentFormat.POSTMAN;
          break;
        case 'insomnia':
          docFormat = DocumentFormat.INSOMNIA;
          break;
        default:
          docFormat = DocumentFormat.CUSTOM;
      }

      // 使用Parser工厂获取对应的解析器
      const parser = ParserFactory.getParser(docFormat);
      if (!parser) {
        throw new Error(`不支持的API规范格式: ${format}`);
      }

      // 使用解析器解析规范并生成测试用例
      const parsedDocument = await parser.parseDocument(specFilePath);
      return await parser.generateTestCases(parsedDocument);
    } catch (error: any) {
      throw new Error(`解析API规范时出错: ${error.message}`);
    }
  }

  /**
   * 根据JSON Schema生成模拟数据
   * @param schema JSON Schema对象
   * @param options 模拟数据生成选项
   */
  generateMockDataFromSchema(schema: any, options: any = {}): any {
    const generator = this.dataGeneratorFactory.getGenerator('schema', {
      ...this.options.mockDataOptions,
      ...options
    });
    return generator.generate(schema, options);
  }

  /**
   * 根据示例数据生成模拟数据
   * @param example 示例数据
   * @param options 模拟数据生成选项
   */
  generateMockDataFromExample(example: any, options: any = {}): any {
    const generator = this.dataGeneratorFactory.getGenerator('example', {
      ...this.options.mockDataOptions,
      ...options
    });
    return generator.generate(example, options);
  }

  /**
   * 使用JSON Schema创建模拟API端点
   * @param endpoint API端点
   * @param method HTTP方法
   * @param responseSchema 响应的JSON Schema
   * @param status HTTP状态码
   * @param headers 响应头
   */
  mockAPIEndpointWithSchema(
    endpoint: string,
    method: string,
    responseSchema: any,
    status: number = 200,
    headers: Record<string, string> = { 'Content-Type': 'application/json' }
  ): void {
    const mockData = this.generateMockDataFromSchema(responseSchema);
    this.mockAPIEndpoint(endpoint, method, {
      status,
      statusText: status === 200 ? 'OK' : String(status),
      headers,
      body: mockData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 使用示例响应创建模拟API端点
   * @param endpoint API端点
   * @param method HTTP方法
   * @param exampleResponse 示例响应
   * @param status HTTP状态码
   * @param headers 响应头
   */
  mockAPIEndpointWithExample(
    endpoint: string,
    method: string,
    exampleResponse: any,
    status: number = 200,
    headers: Record<string, string> = { 'Content-Type': 'application/json' }
  ): void {
    const mockData = this.generateMockDataFromExample(exampleResponse);
    this.mockAPIEndpoint(endpoint, method, {
      status,
      statusText: status === 200 ? 'OK' : String(status),
      headers,
      body: mockData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 批量创建模拟API端点
   * @param mockDefinitions 模拟定义数组
   */
  batchMockAPIEndpoints(mockDefinitions: Array<{
    endpoint: string;
    method: string;
    response: APIResponse | any;
    useExample?: boolean;
    useSchema?: boolean;
    status?: number;
    headers?: Record<string, string>;
  }>): void {
    for (const def of mockDefinitions) {
      if (def.useSchema) {
        this.mockAPIEndpointWithSchema(
          def.endpoint,
          def.method,
          def.response,
          def.status,
          def.headers
        );
      } else if (def.useExample) {
        this.mockAPIEndpointWithExample(
          def.endpoint,
          def.method,
          def.response,
          def.status,
          def.headers
        );
      } else {
        this.mockAPIEndpoint(def.endpoint, def.method, def.response as APIResponse);
      }
    }
  }

  /**
   * 从规范文件创建所有模拟API端点
   * @param specPath 规范文件路径
   * @param format 规范格式
   */
  async mockAllEndpointsFromSpec(specPath: string = "", format: string = "openapi"): Promise<void> {
    const testCases = await this.generateAPITestsFromSpec(specPath, format);
    const parser = this.parserFactory.getParser(format);

    if (!parser) {
      throw new Error(`不支持的API规范格式: ${format}`);
    }

    // 获取规范中定义的所有响应模式
    const responseSchemas = await parser.getResponseSchemas(specPath);

    // 为每个端点创建模拟
    for (const [endpoint, methodSchemas] of Object.entries(responseSchemas)) {
      for (const [method, schema] of Object.entries(methodSchemas)) {
        this.mockAPIEndpointWithSchema(endpoint, method, schema);
      }
    }
  }

  /**
   * 执行API测试
   */
  async runAPITests(testCases: APITestCase[]): Promise<APITestResult[]> {
    const results: APITestResult[] = [];

    for (const testCase of testCases) {
      const startTime = Date.now();
      let passed = true;
      const failedAssertions: string[] = [];

      try {
        // 构建请求URL
        let url = testCase.endpoint;
        if (!url.startsWith("http")) {
          url = new URL(url, this.options.baseUrl).toString();
        }

        // 构建请求配置
        const config: AxiosRequestConfig = {
          method: testCase.method,
          url,
          headers: {
            ...this.options.headers,
            ...testCase.headers,
          },
          data: testCase.body,
          timeout: this.options.timeout,
        };

        // 发送请求
        const axiosResponse = await axios(config);

        // 构建响应对象
        const response: APIResponse = {
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: axiosResponse.headers as Record<string, string>,
          body: axiosResponse.data,
          timestamp: new Date().toISOString(),
        };

        // 验证断言
        for (const assertion of testCase.assertions) {
          const assertionResult = this.evaluateAssertion(assertion, response);
          if (!assertionResult.passed) {
            passed = false;
            failedAssertions.push(assertionResult.message);
          }
        }

        // 添加结果
        results.push({
          testCaseId: testCase.id,
          passed,
          response,
          failedAssertions: failedAssertions.length > 0 ? failedAssertions : undefined,
          duration: Date.now() - startTime,
        });
      } catch (error: any) {
        // 请求失败
        results.push({
          testCaseId: testCase.id,
          passed: false,
          failedAssertions: [`请求失败: ${error.message}`],
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * 评估单个断言
   */
  private evaluateAssertion(assertion: APIAssertion, response: APIResponse): { passed: boolean; message: string } {
    switch (assertion.type) {
      case "status":
        return this.evaluateStatusAssertion(assertion, response);
      case "header":
        return this.evaluateHeaderAssertion(assertion, response);
      case "body":
        return this.evaluateBodyAssertion(assertion, response);
      default:
        return { passed: false, message: `未知断言类型: ${assertion.type}` };
    }
  }

  /**
   * 评估状态码断言
   */
  private evaluateStatusAssertion(
    assertion: APIAssertion,
    response: APIResponse
  ): { passed: boolean; message: string } {
    const actualValue = response.status;
    const expectedValue = assertion.value;

    return this.compareValues(
      actualValue,
      expectedValue,
      assertion.operator,
      `状态码 ${actualValue} ${this.getOperatorSymbol(assertion.operator)} ${expectedValue}`
    );
  }

  /**
   * 评估头信息断言
   */
  private evaluateHeaderAssertion(
    assertion: APIAssertion,
    response: APIResponse
  ): { passed: boolean; message: string } {
    if (!response.headers) {
      return { passed: false, message: `断言失败: 响应没有头信息` };
    }

    // 头信息名称不区分大小写
    const headerName = assertion.target.toLowerCase();
    const headerValue = Object.entries(response.headers).find(([name, _]) => name.toLowerCase() === headerName)?.[1];

    if (headerValue === undefined) {
      return { passed: false, message: `断言失败: 响应没有头信息 ${headerName}` };
    }

    return this.compareValues(
      headerValue,
      assertion.value,
      assertion.operator,
      `头信息 ${headerName}: ${headerValue} ${this.getOperatorSymbol(assertion.operator)} ${assertion.value}`
    );
  }

  /**
   * 评估响应体断言
   */
  private evaluateBodyAssertion(assertion: APIAssertion, response: APIResponse): { passed: boolean; message: string } {
    if (response.body === undefined) {
      return { passed: false, message: `断言失败: 响应没有响应体` };
    }

    // 使用JSONPath或类似方法访问嵌套属性
    const actualValue = this.getValueByPath(response.body, assertion.target);
    if (actualValue === undefined) {
      return { passed: false, message: `断言失败: 路径 ${assertion.target} 在响应体中不存在` };
    }

    return this.compareValues(
      actualValue,
      assertion.value,
      assertion.operator,
      `响应体 ${assertion.target}: ${JSON.stringify(actualValue)} ${this.getOperatorSymbol(
        assertion.operator
      )} ${JSON.stringify(assertion.value)}`
    );
  }

  /**
   * 通过路径获取对象中的值
   */
  private getValueByPath(obj: any, path: string): any {
    // 简单的路径访问实现，实际项目可能需要使用jsonpath或lodash
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * 根据操作符比较值
   */
  private compareValues(
    actual: any,
    expected: any,
    operator: APIAssertion["operator"],
    message: string
  ): { passed: boolean; message: string } {
    let passed = false;

    switch (operator) {
      case "=":
        passed = JSON.stringify(actual) === JSON.stringify(expected);
        break;
      case "!=":
        passed = JSON.stringify(actual) !== JSON.stringify(expected);
        break;
      case ">":
        passed = actual > expected;
        break;
      case "<":
        passed = actual < expected;
        break;
      case "contains":
        passed =
          typeof actual === "string" && typeof expected === "string"
            ? actual.includes(expected)
            : JSON.stringify(actual).includes(JSON.stringify(expected));
        break;
      case "matches":
        passed = new RegExp(expected).test(String(actual));
        break;
      default:
        return { passed: false, message: `未知操作符: ${operator}` };
    }

    return {
      passed,
      message: passed ? `断言成功: ${message}` : `断言失败: ${message}`,
    };
  }

  /**
   * 获取操作符的可读符号
   */
  private getOperatorSymbol(operator: APIAssertion["operator"]): string {
    switch (operator) {
      case "=":
        return "等于";
      case "!=":
        return "不等于";
      case ">":
        return "大于";
      case "<":
        return "小于";
      case "contains":
        return "包含";
      case "matches":
        return "匹配";
      default:
        return operator;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.stopMockServer();
    this.requests = [];
    this.mockEndpoints.clear();
  }
}
