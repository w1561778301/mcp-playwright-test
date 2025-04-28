import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as core from '../types/core';
import { projectConfig, testConfig } from '../utils/config';

export type TestType = 'ui' | 'api';

export class TestGeneratorService {
  private storageDir: string;
  private mcpEnabled: boolean = false;
  private mcpClient: any = null;

  constructor(storageDir?: string, mcpClient?: any) {
    // 使用传入的存储目录、环境变量配置或默认值
    this.storageDir =
      storageDir || testConfig.storageDir || path.join(process.cwd(), 'test-suites');
    this.ensureDirectoryExists(this.storageDir);

    // 如果传入了MCP客户端，则使用MCP模式
    if (mcpClient) {
      this.mcpEnabled = true;
      this.mcpClient = mcpClient;
    }
  }

  /**
   * 设置MCP客户端
   * @param client MCP客户端实例
   */
  public setMCPClient(client: any): void {
    this.mcpClient = client;
    this.mcpEnabled = !!client;
  }

  /**
   * Generate test cases from text requirements
   */
  public async generateFromText(
    requirementsText: string,
    testType: TestType,
    apiSpec?: string
  ): Promise<{
    success: boolean;
    testSuiteId?: string;
    testSuiteName?: string;
    testCasesCount?: number;
    error?: string;
  }> {
    try {
      console.log(`根据文本要求生成${testType === 'ui' ? 'UI' : 'API'}测试用例`);

      // 如果未提供API规范但配置了API文档路径，尝试从文件加载
      if (!apiSpec && testType === 'api' && projectConfig.apiDocPath) {
        const apiDocPath = projectConfig.apiDocPath;
        if (fs.existsSync(apiDocPath)) {
          console.log(`从环境变量配置的路径加载API文档: ${apiDocPath}`);
          apiSpec = fs.readFileSync(apiDocPath, 'utf-8');
        } else {
          console.warn(`环境变量配置的API文档路径不存在: ${apiDocPath}`);
        }
      }

      // Generate a unique ID for the test suite
      const testSuiteId = this.generateId();

      // Generate test cases using LLM
      const testSuite = await this.generateTestCasesUsingLLM(requirementsText, testType, apiSpec);

      if (!testSuite) {
        throw new Error('Failed to generate test cases');
      }

      // Set the test suite ID and save to disk
      testSuite.id = testSuiteId;
      testSuite.createdAt = Date.now();

      // Save the test suite to disk
      await this.saveTestSuite(testSuite);

      return {
        success: true,
        testSuiteId: testSuite.id,
        testSuiteName: testSuite.name,
        testCasesCount: testSuite.testCases.length,
      };
    } catch (error) {
      console.error('Error generating test cases from text:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating test cases',
      };
    }
  }

  /**
   * Generate test cases from a document file
   */
  public async generateFromDocument(
    documentPath: string,
    testType: TestType,
    apiSpec?: string
  ): Promise<{
    success: boolean;
    testSuiteId?: string;
    testSuiteName?: string;
    testCasesCount?: number;
    error?: string;
  }> {
    try {
      // 处理相对路径
      if (!path.isAbsolute(documentPath)) {
        documentPath = path.resolve(process.cwd(), documentPath);
      }

      if (!fs.existsSync(documentPath)) {
        throw new Error(`Document not found at path: ${documentPath}`);
      }

      console.log(`从文档生成${testType === 'ui' ? 'UI' : 'API'}测试用例: ${documentPath}`);

      // 如果未提供API规范但配置了API文档路径，尝试从文件加载
      if (!apiSpec && testType === 'api' && projectConfig.apiDocPath) {
        const apiDocPath = projectConfig.apiDocPath;
        if (fs.existsSync(apiDocPath)) {
          console.log(`从环境变量配置的路径加载API文档: ${apiDocPath}`);
          apiSpec = fs.readFileSync(apiDocPath, 'utf-8');
        } else {
          console.warn(`环境变量配置的API文档路径不存在: ${apiDocPath}`);
        }
      }

      // Read the document content
      const requirementsText = fs.readFileSync(documentPath, 'utf-8');

      // Generate test cases from the document content
      return this.generateFromText(requirementsText, testType, apiSpec);
    } catch (error) {
      console.error('Error generating test cases from document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating test cases',
      };
    }
  }

  /**
   * Get test cases by test suite ID
   */
  public async getTestCases(testSuiteId: string): Promise<core.TestSuite> {
    try {
      const filePath = path.join(this.storageDir, `${testSuiteId}.json`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Test suite not found with ID: ${testSuiteId}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as core.TestSuite;
    } catch (error) {
      console.error('Error getting test cases:', error);
      throw error;
    }
  }

  /**
   * Generate test cases using LLM (via MCP client if available, or fallback to direct API)
   */
  private async generateTestCasesUsingLLM(
    requirementsText: string,
    testType: TestType,
    apiSpec?: string
  ): Promise<core.TestSuite | null> {
    try {
      // Create a prompt for the LLM based on the requirements and test type
      let prompt = '';

      if (testType === 'ui') {
        prompt = `
请根据以下需求生成一个UI测试套件。以JSON格式返回，结构如下：
{
  "name": "测试套件名称",
  "description": "测试套件描述",
  "testCases": [
    {
      "id": "tc1",
      "name": "测试用例名称",
      "description": "测试用例描述",
      "steps": [
        {
          "id": "step1",
          "description": "步骤描述",
          "action": "click|type|navigate|assert|wait",
          "selector": "CSS或XPath选择器（如适用）",
          "value": "输入值（如适用）",
          "expectedResult": "此步骤的预期结果"
        }
      ]
    }
  ]
}

需求文档:
${requirementsText}

记得创建全面的测试用例，涵盖正向和负向场景。仅返回JSON格式，不要包含任何解释或markdown。
`;
      } else if (testType === 'api') {
        prompt = `
请根据以下需求生成一个API测试套件。以JSON格式返回，结构如下：
{
  "name": "API测试套件名称",
  "description": "API测试套件描述",
  "testCases": [
    {
      "id": "tc1",
      "name": "API测试用例名称",
      "description": "API测试用例描述",
      "steps": [
        {
          "id": "step1",
          "description": "步骤描述",
          "action": "request",
          "method": "GET|POST|PUT|DELETE",
          "endpoint": "/api/endpoint",
          "headers": {"Content-Type": "application/json"},
          "body": "请求体（如适用）",
          "expectedStatus": 200,
          "expectedResponse": "预期响应模式"
        }
      ]
    }
  ]
}

需求文档:
${requirementsText}
${apiSpec ? `\n\nAPI规范:\n${apiSpec}` : ''}

记得创建全面的测试用例，涵盖正向和负向场景。仅返回JSON格式，不要包含任何解释或markdown。
`;
      }

      let testSuiteJson = '';

      // 使用MCP客户端或直接调用API
      if (this.mcpEnabled && this.mcpClient) {
        console.log('使用MCP客户端生成测试用例');

        // 使用MCP客户端调用LLM
        const result = await this.mcpClient.callTool({
          name: 'generate-json-content',
          arguments: {
            prompt: prompt,
            systemPrompt:
              '你是一个测试自动化专家。请生成全面的测试用例，仅返回指定的JSON格式。不要包含任何解释或其他格式，仅返回JSON对象。',
          },
        });

        if (result.content && result.content.length > 0) {
          testSuiteJson = result.content[0].text;
        }
      } else {
        console.log('MCP客户端未配置，使用备用方法生成测试用例');

        // 备用：使用简单的模拟测试套件
        testSuiteJson = this.generateFallbackTestSuite(testType, requirementsText);
      }

      // 清理响应，仅提取JSON部分
      testSuiteJson = testSuiteJson.replace(/```json\s*|\s*```/g, '');

      // 解析JSON响应
      const testSuiteData = JSON.parse(testSuiteJson);

      // 创建测试套件对象
      const testSuite: core.TestSuite = {
        id: this.generateId(),
        name: testSuiteData.name || `测试套件 - ${new Date().toLocaleString()}`,
        description: testSuiteData.description || `根据需求生成`,
        testCases: testSuiteData.testCases || [],
        createdAt: Date.now(),
      };

      return testSuite;
    } catch (error) {
      console.error('Error generating test cases using LLM:', error);
      return null;
    }
  }

  /**
   * 生成备用测试套件（当MCP客户端不可用时）
   */
  private generateFallbackTestSuite(testType: TestType, requirementsText: string): string {
    const firstLine = requirementsText.split('\n')[0] || '未命名测试';

    if (testType === 'ui') {
      return JSON.stringify({
        name: `UI测试套件 - ${firstLine}`,
        description: '自动生成的UI测试套件',
        testCases: [
          {
            id: 'tc1',
            name: '基本功能测试',
            description: '测试应用的基本功能',
            steps: [
              {
                id: 'step1',
                description: '导航到主页',
                action: 'navigate',
                value: 'https://example.com',
                expectedResult: '页面成功加载',
              },
              {
                id: 'step2',
                description: '点击登录按钮',
                action: 'click',
                selector: '#login-button',
                expectedResult: '弹出登录表单',
              },
            ],
          },
        ],
      });
    } else {
      return JSON.stringify({
        name: `API测试套件 - ${firstLine}`,
        description: '自动生成的API测试套件',
        testCases: [
          {
            id: 'tc1',
            name: '获取用户数据',
            description: '测试获取用户数据API',
            steps: [
              {
                id: 'step1',
                description: '发送GET请求获取用户列表',
                action: 'request',
                method: 'GET',
                endpoint: '/api/users',
                headers: { 'Content-Type': 'application/json' },
                expectedStatus: 200,
                expectedResponse: '包含用户列表的JSON响应',
              },
            ],
          },
        ],
      });
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Save test suite to file
   */
  private async saveTestSuite(testSuite: core.TestSuite): Promise<void> {
    const filePath = path.join(this.storageDir, `${testSuite.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testSuite, null, 2));
  }
}
