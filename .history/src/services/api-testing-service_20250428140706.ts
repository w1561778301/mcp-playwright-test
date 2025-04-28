import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import * as core from "../types/core";
import { TestGeneratorService, TestType } from "./test-generator-service";

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  requestSchema?: any;
  responseSchema?: any;
  requestExamples?: any[];
  responseExamples?: any[];
}

export interface ApiSpec {
  id: string;
  title: string;
  version: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export interface ApiTestCaseResult {
  testCaseId: string;
  passed: boolean;
  endpoint: string;
  method: string;
  status: number;
  statusText: string;
  requestPayload?: any;
  responseBody?: any;
  duration: number;
  errors?: Error[];
}

export interface ApiTestResult {
  id: string;
  testSuiteId: string;
  passed: boolean;
  results: ApiTestCaseResult[];
  startTime: string;
  endTime: string;
  duration: number;
}

export type ApiDocFormat = "openapi" | "swagger" | "apifox" | "auto";

export class ApiTestingService {
  private apiSpecs: Map<string, ApiSpec> = new Map();
  private testResults: Map<string, ApiTestResult> = new Map();
  private mockEndpoints: Map<string, any> = new Map();
  private storageDir: string;
  private testGenerator: TestGeneratorService;
  private mcpEnabled: boolean = false;
  private mcpClient: any = null;

  constructor(storageDir?: string, mcpClient?: any) {
    // 初始化存储目录
    this.storageDir = storageDir || path.join(process.cwd(), "api-testing");
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // 如果传入了MCP客户端，则使用MCP模式
    if (mcpClient) {
      this.mcpEnabled = true;
      this.mcpClient = mcpClient;
    }

    // 加载现有API规范和测试结果
    this.loadApiSpecs();
    this.loadTestResults();

    this.testGenerator = new TestGeneratorService(undefined, mcpClient);
  }

  /**
   * 设置MCP客户端
   * @param client MCP客户端实例
   */
  public setMCPClient(client: any): void {
    this.mcpClient = client;
    this.mcpEnabled = !!client;
    this.testGenerator.setMCPClient(client);
  }

  /**
   * Generate API tests based on OpenAPI specification
   */
  public async generateTests(
    apiSpecPath: string,
    options: {
      endpoints?: string[];
      methods?: string[];
      generateForAll?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    testSuiteId?: string;
    endpointsCovered?: string[];
    testCasesCount?: number;
    error?: string;
  }> {
    try {
      if (!fs.existsSync(apiSpecPath)) {
        throw new Error(`API specification file not found at ${apiSpecPath}`);
      }

      const apiSpec = fs.readFileSync(apiSpecPath, "utf-8");

      // Parse OpenAPI spec - simple parsing for demo
      const specObj = JSON.parse(apiSpec);

      // Build requirements text based on API spec and options
      const requirementsText = this.buildRequirementsFromSpec(
        specObj,
        options.endpoints || [],
        options.methods || [],
        options.generateForAll || false
      );

      // Generate test cases using the built requirements
      const result = await this.testGenerator.generateFromText(requirementsText, "api", apiSpec);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        testSuiteId: result.testSuiteId,
        endpointsCovered: this.extractEndpointsFromSpec(specObj, options),
        testCasesCount: result.testCasesCount,
      };
    } catch (error) {
      console.error("Error generating API tests:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error generating API tests",
      };
    }
  }

  /**
   * Extract list of endpoints covered by the API spec filtering
   */
  private extractEndpointsFromSpec(
    spec: any,
    options: { endpoints?: string[]; methods?: string[]; generateForAll?: boolean }
  ): string[] {
    try {
      const endpointList: string[] = [];
      const paths = spec.paths || {};

      for (const path in paths) {
        // Skip if endpoints specified and this one is not included
        if (options.endpoints && options.endpoints.length > 0 && !options.endpoints.includes(path)) {
          continue;
        }

        const methods = paths[path];

        for (const method in methods) {
          // Skip if methods specified and this one is not included
          if (options.methods && options.methods.length > 0 && !options.methods.includes(method.toUpperCase())) {
            continue;
          }

          endpointList.push(`${method.toUpperCase()} ${path}`);
        }
      }

      return endpointList;
    } catch (error) {
      console.error("Error extracting endpoints:", error);
      return [];
    }
  }

  /**
   * Build requirements text from OpenAPI spec for test generation
   */
  private buildRequirementsFromSpec(
    spec: any,
    endpoints: string[],
    methods: string[],
    generateForAll: boolean
  ): string {
    try {
      let requirements = `# API Test Requirements\n\n`;
      requirements += `## API Information\n`;
      requirements += `- Title: ${spec.info?.title || "Unknown API"}\n`;
      requirements += `- Version: ${spec.info?.version || "Unknown"}\n`;
      requirements += `- Description: ${spec.info?.description || "No description provided"}\n\n`;

      requirements += `## Endpoints to Test\n\n`;

      const paths = spec.paths || {};

      for (const path in paths) {
        // Skip if endpoints specified and this one is not included
        if (endpoints.length > 0 && !endpoints.includes(path) && !generateForAll) {
          continue;
        }

        const pathItem = paths[path];
        requirements += `### Endpoint: ${path}\n\n`;

        for (const method in pathItem) {
          // Skip if methods specified and this one is not included
          if (methods.length > 0 && !methods.includes(method.toUpperCase()) && !generateForAll) {
            continue;
          }

          const operation = pathItem[method];

          requirements += `#### ${method.toUpperCase()}\n`;
          requirements += `- Summary: ${operation.summary || "No summary"}\n`;
          requirements += `- Operation ID: ${operation.operationId || "No ID"}\n`;

          if (operation.parameters && operation.parameters.length > 0) {
            requirements += `- Parameters:\n`;
            for (const param of operation.parameters) {
              requirements += `  - ${param.name} (${param.in}): ${param.description || "No description"} - Required: ${
                param.required ? "Yes" : "No"
              }\n`;
            }
          }

          if (operation.requestBody) {
            requirements += `- Request Body: Required - ${operation.requestBody.required ? "Yes" : "No"}\n`;
            const content = operation.requestBody.content || {};
            for (const mediaType in content) {
              requirements += `  - Media Type: ${mediaType}\n`;
            }
          }

          if (operation.responses) {
            requirements += `- Responses:\n`;
            for (const statusCode in operation.responses) {
              const response = operation.responses[statusCode];
              requirements += `  - ${statusCode}: ${response.description || "No description"}\n`;
            }
          }

          requirements += `\n`;
        }
      }

      // Add test requirements instructions
      requirements += `## Test Requirements\n\n`;
      requirements += `1. Create positive test cases that validate successful responses\n`;
      requirements += `2. Create negative test cases for error handling\n`;
      requirements += `3. Test with valid and invalid parameter values\n`;
      requirements += `4. Verify response structures match API specifications\n`;
      requirements += `5. For any authenticated endpoints, include authentication testing\n`;

      return requirements;
    } catch (error) {
      console.error("Error building requirements from spec:", error);
      return `API Test Requirements for ${spec.info?.title || "Unknown API"}`;
    }
  }

  /**
   * 从规范文件生成API测试用例
   * @param specPath 规范文件路径
   * @param format 规范格式
   * @returns 测试套件ID
   */
  async generateTestsFromSpec(specPath: string, format: ApiDocFormat = "auto"): Promise<string> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(specPath)) {
        throw new Error(`API specification file not found: ${specPath}`);
      }

      // 读取规范文件
      const fileContent = fs.readFileSync(specPath, "utf-8");

      // 检测格式（如果是auto）
      if (format === "auto") {
        format = this.detectFormat(fileContent);
      }

      // 解析API规范
      const apiSpec = await this.parseApiSpec(fileContent, format);

      // 保存API规范
      this.apiSpecs.set(apiSpec.id, apiSpec);
      this.saveApiSpec(apiSpec);

      // 从规范生成测试用例
      const generatedTestCases = await this.generateTestCasesFromApiSpec(apiSpec);

      // 创建测试套件
      const testSuiteId = randomUUID();
      const testSuite: core.TestSuite = {
        id: testSuiteId,
        name: `API Test Suite - ${apiSpec.title}`,
        description: `Generated from API specification: ${apiSpec.title} ${apiSpec.version}`,
        testCases: generatedTestCases,
        createdAt: Date.now(),
      };

      // 保存测试套件
      const testSuitesDir = path.join(process.cwd(), "test-suites");
      if (!fs.existsSync(testSuitesDir)) {
        fs.mkdirSync(testSuitesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(testSuitesDir, `${testSuiteId}.json`), JSON.stringify(testSuite, null, 2));

      return testSuiteId;
    } catch (error) {
      console.error("Error generating API test cases:", error);
      throw new Error(`Failed to generate API test cases: ${(error as Error).message}`);
    }
  }

  /**
   * 运行API测试
   * @param testSuiteId 测试套件ID
   * @returns 测试结果ID
   */
  async runApiTests(testSuiteId: string): Promise<string> {
    try {
      // 加载测试套件
      const testSuitePath = path.join(process.cwd(), "test-suites", `${testSuiteId}.json`);

      if (!fs.existsSync(testSuitePath)) {
        throw new Error(`Test suite not found: ${testSuiteId}`);
      }

      const testSuiteContent = fs.readFileSync(testSuitePath, "utf-8");
      const testSuite = JSON.parse(testSuiteContent) as core.TestSuite;

      // 验证是否为API测试套件
      if (!testSuite.description.includes("API")) {
        throw new Error(`Test suite is not an API test suite: ${testSuiteId}`);
      }

      // 创建测试结果ID
      const resultId = randomUUID();
      const startTime = new Date();

      // 执行每个测试用例
      const results: ApiTestCaseResult[] = [];

      for (const testCase of testSuite.testCases) {
        console.log(`Running API test case: ${testCase.description}`);

        for (const step of testCase.steps) {
          // 跳过非API请求步骤
          if (step.action !== "request") {
            continue;
          }

          const testStartTime = Date.now();
          let passed = true;
          let status = 0;
          let statusText = "";
          let requestPayload = null;
          let responseBody: any = null;
          const errors: Error[] = [];

          try {
            // 解析测试数据
            const requestData = JSON.parse(step.value || "{}");
            const endpoint = step.selector || "";
            const method = requestData.method || "GET";

            // 检查是否有模拟响应
            const mockKey = `${method}:${endpoint}`;
            if (this.mockEndpoints.has(mockKey)) {
              // 使用模拟响应
              const mockResponse = this.mockEndpoints.get(mockKey);

              status = mockResponse.statusCode;
              statusText = mockResponse.statusText || "OK";
              responseBody = mockResponse.response;
              requestPayload = requestData.body;

              // 验证状态码
              if (requestData.expectedStatus && requestData.expectedStatus !== status) {
                passed = false;
                errors.push(new Error(`Expected status ${requestData.expectedStatus}, got ${status}`));
              }
            } else {
              // 执行实际请求
              const response = await fetch(endpoint, {
                method,
                headers: {
                  "Content-Type": "application/json",
                  ...requestData.headers,
                },
                body: requestData.body ? JSON.stringify(requestData.body) : undefined,
              });

              status = response.status;
              statusText = response.statusText;
              requestPayload = requestData.body;

              // 尝试解析响应体
              try {
                responseBody = await response.json();
              } catch (e) {
                // 如果不是JSON，获取文本
                const textContent = await response.text();
                responseBody = textContent || null;
              }

              // 验证状态码
              if (requestData.expectedStatus && requestData.expectedStatus !== status) {
                passed = false;
                errors.push(new Error(`Expected status ${requestData.expectedStatus}, got ${status}`));
              }

              // 验证响应体（如果提供了期望的响应）
              if (requestData.expectedResponse) {
                // 这里应该实现更复杂的响应验证
                // 目前只是简单检查响应体是否存在
                if (!responseBody) {
                  passed = false;
                  errors.push(new Error("Expected response body, but got empty response"));
                }
              }
            }
          } catch (error) {
            passed = false;
            errors.push(error as Error);
            console.error(`API test failed: ${(error as Error).message}`);
          }

          // 计算持续时间
          const duration = Date.now() - testStartTime;

          // 记录结果
          results.push({
            testCaseId: testCase.id,
            passed,
            endpoint: step.selector || "",
            method: JSON.parse(step.value || '{"method":"GET"}').method,
            status,
            statusText,
            requestPayload,
            responseBody,
            duration,
            errors: errors.length > 0 ? errors : undefined,
          });
        }
      }

      // 计算总体结果
      const endTime = new Date();
      const allPassed = results.every((result) => result.passed);

      // 创建测试结果
      const apiTestResult: ApiTestResult = {
        id: resultId,
        testSuiteId,
        passed: allPassed,
        results,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      };

      // 保存测试结果
      this.testResults.set(resultId, apiTestResult);
      this.saveTestResult(apiTestResult);

      return resultId;
    } catch (error) {
      console.error("Error running API tests:", error);
      throw new Error(`Failed to run API tests: ${(error as Error).message}`);
    }
  }

  /**
   * 获取测试报告
   * @param reportId 报告ID
   * @returns 测试报告
   */
  async getReport(reportId: string): Promise<ApiTestResult> {
    const report = this.testResults.get(reportId);
    if (!report) {
      throw new Error(`Test report not found: ${reportId}`);
    }
    return report;
  }

  /**
   * 模拟API端点
   * @param endpoint API端点
   * @param method HTTP方法
   * @param statusCode 状态码
   * @param response 响应数据
   */
  async mockApiEndpoint(endpoint: string, method: string, statusCode: number, response: any): Promise<void> {
    try {
      const key = `${method}:${endpoint}`;

      this.mockEndpoints.set(key, {
        statusCode,
        statusText: this.getStatusText(statusCode),
        response,
      });

      console.log(`Mocked API endpoint: ${method} ${endpoint}`);
    } catch (error) {
      console.error("Error mocking API endpoint:", error);
      throw new Error(`Failed to mock API endpoint: ${(error as Error).message}`);
    }
  }

  /**
   * 获取API规范
   * @param specId 规范ID
   * @returns API规范
   */
  async getApiSpec(specId: string): Promise<ApiSpec> {
    const apiSpec = this.apiSpecs.get(specId);
    if (!apiSpec) {
      throw new Error(`API specification not found: ${specId}`);
    }
    return apiSpec;
  }

  /**
   * 检测API文档格式
   * @param content 文档内容
   * @returns 文档格式
   */
  private detectFormat(content: string): ApiDocFormat {
    try {
      const json = JSON.parse(content);

      // 检查是否是OpenAPI/Swagger
      if (json.openapi || json.swagger) {
        return json.openapi ? "openapi" : "swagger";
      }

      // 检查是否是Apifox
      if (json.apifoxExtensions) {
        return "apifox";
      }

      // 默认返回OpenAPI
      return "openapi";
    } catch (error) {
      // 如果不是有效的JSON，假设为其他格式
      console.warn("Could not determine API specification format:", error);
      return "openapi";
    }
  }

  /**
   * 解析API规范文件
   * @param content 文件内容
   * @param format 文件格式
   * @returns API规范
   */
  private async parseApiSpec(content: string, format: ApiDocFormat): Promise<ApiSpec> {
    try {
      // 构建提示
      const prompt = `
请将以下API规范文档解析为JSON格式的API端点列表。

API文档格式: ${format}

文档内容:
${content.substring(0, 20000)} ${content.length > 20000 ? "... (截断)" : ""}

请使用以下JSON格式输出:
{
  "title": "API标题",
  "version": "API版本",
  "description": "API描述",
  "endpoints": [
    {
      "path": "端点路径",
      "method": "HTTP方法",
      "summary": "端点摘要",
      "description": "端点描述",
      "requestSchema": {}, // 请求体架构
      "responseSchema": {}, // 响应体架构
      "requestExamples": [], // 请求示例列表
      "responseExamples": [] // 响应示例列表
    }
  ]
}
`;

      let parsedSpec: any;

      // 使用MCP客户端或备用方法解析API规范
      if (this.mcpEnabled && this.mcpClient) {
        console.log("使用MCP客户端解析API规范");

        // 使用MCP客户端调用LLM
        const result = await this.mcpClient.callTool({
          name: "generate-json-content",
          arguments: {
            prompt: prompt,
            systemPrompt:
              "你是一个擅长解析API文档的专家，请将API规范文档解析为结构化的JSON对象。只返回JSON格式的数据，不要有其他解释或标记。",
          },
        });

        if (result.content && result.content.length > 0) {
          const jsonText = result.content[0].text.replace(/```json\s*|\s*```/g, "");
          parsedSpec = JSON.parse(jsonText);
        } else {
          throw new Error("Failed to parse API specification using MCP client");
        }
      } else {
        console.log("MCP客户端未配置，使用备用方法解析API规范");

        // 备用：使用简单的解析逻辑
        parsedSpec = this.generateFallbackApiSpec(content, format);
      }

      // 创建API规范
      const apiSpec: ApiSpec = {
        id: randomUUID(),
        title: parsedSpec.title || "Unknown API",
        version: parsedSpec.version || "1.0.0",
        description: parsedSpec.description,
        endpoints: parsedSpec.endpoints || [],
      };

      return apiSpec;
    } catch (error) {
      console.error("Error parsing API specification:", error);
      // 出错时返回一个简单的API规范
      return {
        id: randomUUID(),
        title: "Failed to Parse API",
        version: "1.0.0",
        description: "Failed to parse API specification",
        endpoints: [],
      };
    }
  }

  /**
   * 从API规范生成测试用例
   * @param apiSpec API规范
   * @returns 测试用例数组
   */
  private async generateTestCasesFromApiSpec(apiSpec: ApiSpec): Promise<core.TestCase[]> {
    try {
      // 构建提示
      const prompt = `
请根据以下API规范为每个端点生成测试用例。
每个测试用例都应包含一个描述和详细的测试步骤。

API规范:
Title: ${apiSpec.title}
Version: ${apiSpec.version}
Description: ${apiSpec.description || "N/A"}

端点列表:
${apiSpec.endpoints
  .map(
    (endpoint) => `
路径: ${endpoint.path}
方法: ${endpoint.method}
摘要: ${endpoint.summary}
描述: ${endpoint.description || "N/A"}
`
  )
  .join("\n")}

请使用以下JSON格式生成测试用例:
[
  {
    "id": "生成一个唯一ID",
    "name": "测试用例名称",
    "description": "测试用例描述",
    "steps": [
      {
        "id": "步骤ID",
        "description": "步骤描述",
        "action": "request",
        "selector": "API路径",
        "value": "{ \"method\": \"GET/POST/PUT/DELETE\", \"headers\": {}, \"body\": {}, \"expectedStatus\": 200, \"expectedResponse\": {} }"
      }
    ]
  }
]

为每个端点至少生成1个测试用例，每个测试用例至少包含1个步骤。
确保测试用例覆盖了API规范中提到的所有端点。
`;

      let testCases: core.TestCase[];

      // 使用MCP客户端或备用方法生成测试用例
      if (this.mcpEnabled && this.mcpClient) {
        console.log("使用MCP客户端生成API测试用例");

        // 使用MCP客户端调用LLM
        const result = await this.mcpClient.callTool({
          name: "generate-json-content",
          arguments: {
            prompt: prompt,
            systemPrompt:
              "你是一个专业的API测试专家，擅长根据API规范生成测试用例。请只返回JSON格式的响应，不要添加任何额外的解释或Markdown格式。",
          },
        });

        if (result.content && result.content.length > 0) {
          const jsonText = result.content[0].text.replace(/```json\s*|\s*```/g, "");
          testCases = JSON.parse(jsonText);
        } else {
          throw new Error("Failed to generate test cases using MCP client");
        }
      } else {
        console.log("MCP客户端未配置，使用备用方法生成API测试用例");

        // 备用：生成简单的测试用例
        testCases = this.generateFallbackTestCases(apiSpec);
      }

      return testCases;
    } catch (error) {
      console.error("Error generating test cases from API spec:", error);
      // 出错时返回一个简单的测试用例
      return [
        {
          id: randomUUID(),
          name: "Default API Test Case",
          description: "Default API test case (LLM generation failed)",
          steps: [
            {
              id: randomUUID(),
              description: "Simple GET request",
              action: "request",
              selector: "https://example.com/api",
              value: JSON.stringify({
                method: "GET",
                headers: {},
                expectedStatus: 200,
              }),
            },
          ],
        },
      ];
    }
  }

  /**
   * 生成备用API规范（当MCP客户端不可用时）
   */
  private generateFallbackApiSpec(content: string, format: ApiDocFormat): any {
    try {
      // 尝试解析JSON
      const parsed = JSON.parse(content);

      // 简单提取API信息
      const title = parsed.info?.title || parsed.title || "Unknown API";
      const version = parsed.info?.version || parsed.version || "1.0.0";
      const description = parsed.info?.description || parsed.description || "";

      // 提取端点
      const endpoints: ApiEndpoint[] = [];

      // 处理OpenAPI/Swagger格式
      if (parsed.paths) {
        for (const path in parsed.paths) {
          const pathData = parsed.paths[path];

          for (const method in pathData) {
            if (["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())) {
              const operation = pathData[method];

              endpoints.push({
                path: path,
                method: method.toUpperCase(),
                summary: operation.summary || `${method.toUpperCase()} ${path}`,
                description: operation.description || "",
              });
            }
          }
        }
      }

      return {
        title,
        version,
        description,
        endpoints,
      };
    } catch (error) {
      console.warn("Error parsing API spec content:", error);

      // 返回一个最小的API规范
      return {
        title: "Unknown API",
        version: "1.0.0",
        description: "Failed to parse API specification",
        endpoints: [],
      };
    }
  }

  /**
   * 生成备用测试用例（当MCP客户端不可用时）
   */
  private generateFallbackTestCases(apiSpec: ApiSpec): core.TestCase[] {
    const testCases: core.TestCase[] = [];

    // 为每个端点生成一个测试用例
    for (const endpoint of apiSpec.endpoints) {
      const testCase: core.TestCase = {
        id: randomUUID(),
        name: `Test ${endpoint.method} ${endpoint.path}`,
        description: endpoint.summary || `Test for ${endpoint.method} ${endpoint.path}`,
        steps: [
          {
            id: randomUUID(),
            description: `发送 ${endpoint.method} 请求到 ${endpoint.path}`,
            action: "request",
            selector: `https://api.example.com${endpoint.path}`,
            value: JSON.stringify({
              method: endpoint.method,
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              expectedStatus: 200,
            }),
          },
        ],
      };

      testCases.push(testCase);
    }

    // 如果没有端点，添加一个默认测试用例
    if (testCases.length === 0) {
      testCases.push({
        id: randomUUID(),
        name: "Default API Test",
        description: "Default API test for empty specification",
        steps: [
          {
            id: randomUUID(),
            description: "Simple GET request to default endpoint",
            action: "request",
            selector: "https://api.example.com/",
            value: JSON.stringify({
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              expectedStatus: 200,
            }),
          },
        ],
      });
    }

    return testCases;
  }

  /**
   * 根据状态码获取状态文本
   * @param statusCode 状态码
   * @returns 状态文本
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: "OK",
      201: "Created",
      202: "Accepted",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      409: "Conflict",
      500: "Internal Server Error",
    };

    return statusTexts[statusCode] || "Unknown";
  }

  /**
   * 保存API规范
   * @param apiSpec API规范
   */
  private saveApiSpec(apiSpec: ApiSpec): void {
    const filePath = path.join(this.storageDir, `api_spec_${apiSpec.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(apiSpec, null, 2));
  }

  /**
   * 保存API测试结果
   * @param testResult API测试结果
   */
  private saveTestResult(testResult: ApiTestResult): void {
    const filePath = path.join(this.storageDir, `api_result_${testResult.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testResult, null, 2));
  }

  /**
   * 加载所有API规范
   */
  private loadApiSpecs(): void {
    try {
      const files = fs.readdirSync(this.storageDir);

      for (const file of files) {
        if (file.startsWith("api_spec_") && file.endsWith(".json")) {
          try {
            const filePath = path.join(this.storageDir, file);
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const apiSpec = JSON.parse(fileContent) as ApiSpec;
            this.apiSpecs.set(apiSpec.id, apiSpec);
          } catch (error) {
            console.warn(`Error loading API spec file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Error loading API specs:", error);
      // 继续执行，即使加载失败
    }
  }

  /**
   * 加载所有API测试结果
   */
  private loadTestResults(): void {
    try {
      const files = fs.readdirSync(this.storageDir);

      for (const file of files) {
        if (file.startsWith("api_result_") && file.endsWith(".json")) {
          try {
            const filePath = path.join(this.storageDir, file);
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const testResult = JSON.parse(fileContent) as ApiTestResult;
            this.testResults.set(testResult.id, testResult);
          } catch (error) {
            console.warn(`Error loading API test result file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("Error loading API test results:", error);
      // 继续执行，即使加载失败
    }
  }
}
