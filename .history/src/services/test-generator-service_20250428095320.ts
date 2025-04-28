import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Anthropic } from '@anthropic-ai/sdk';

export interface TestStep {
  id: string;
  description: string;
  action: string;
  target?: string;
  value?: string;
  customScript?: string;
  screenshot?: boolean;
}

export interface TestCase {
  id: string;
  description: string;
  steps: TestStep[];
  tags?: string[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  createdAt: string;
  type: 'ui' | 'api' | 'both';
}

export type TestType = 'ui' | 'api' | 'both';

export class TestGeneratorService {
  private testSuites: Map<string, TestSuite> = new Map();
  private anthropic: Anthropic;
  private storageDir: string;

  constructor(storageDir?: string) {
    // 初始化存储目录
    this.storageDir = storageDir || path.join(process.cwd(), 'test-suites');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // 初始化 Anthropic LLM 客户端
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.anthropic = new Anthropic({
      apiKey,
    });

    // 加载现有测试套件
    this.loadTestSuites();
  }

  /**
   * 从文本需求生成测试用例
   * @param requirementsText 需求文本
   * @param testType 测试类型
   * @returns 测试套件ID
   */
  async generateFromText(requirementsText: string, testType: TestType): Promise<string> {
    try {
      // 生成测试套件ID
      const testSuiteId = randomUUID();

      // 根据测试类型确定要生成的测试套件类型
      const generatedTestCases = await this.generateTestCasesUsingLLM(requirementsText, testType);

      // 创建测试套件
      const testSuite: TestSuite = {
        id: testSuiteId,
        name: `Test Suite from Text - ${new Date().toLocaleString()}`,
        description: `Generated from text requirements: ${requirementsText.substring(0, 100)}...`,
        testCases: generatedTestCases,
        createdAt: new Date().toISOString(),
        type: testType,
      };

      // 保存测试套件
      this.testSuites.set(testSuiteId, testSuite);
      this.saveTestSuite(testSuite);

      return testSuiteId;
    } catch (error) {
      console.error('Error generating test cases from text:', error);
      throw new Error(`Failed to generate test cases: ${(error as Error).message}`);
    }
  }

  /**
   * 从文档文件生成测试用例
   * @param documentPath 文档路径
   * @param testType 测试类型
   * @returns 测试套件ID
   */
  async generateFromDocument(documentPath: string, testType: TestType): Promise<string> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(documentPath)) {
        throw new Error(`Document not found: ${documentPath}`);
      }

      // 读取文档内容
      const fileContent = fs.readFileSync(documentPath, 'utf-8');

      // 使用文档内容生成测试用例
      return this.generateFromText(fileContent, testType);
    } catch (error) {
      console.error('Error generating test cases from document:', error);
      throw new Error(`Failed to generate test cases from document: ${(error as Error).message}`);
    }
  }

  /**
   * 获取测试用例
   * @param testSuiteId 测试套件ID
   * @returns 测试套件
   */
  async getTestCases(testSuiteId: string): Promise<TestSuite> {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite not found: ${testSuiteId}`);
    }
    return testSuite;
  }

  /**
   * 使用LLM生成测试用例
   * @param requirementsText 需求文本
   * @param testType 测试类型
   * @returns 测试用例数组
   */
  private async generateTestCasesUsingLLM(requirementsText: string, testType: TestType): Promise<TestCase[]> {
    try {
      // 构建提示
      let prompt = '';

      if (testType === 'ui' || testType === 'both') {
        prompt = `
你是一个专业的软件测试专家，请根据以下需求文档生成详细的UI测试用例。
每个测试用例都应该有一个描述和详细的测试步骤。测试步骤应该包括操作、目标（CSS选择器或XPath）和输入值。

需求文档:
${requirementsText}

请使用以下JSON格式生成测试用例:
[
  {
    "id": "生成一个唯一ID",
    "description": "测试用例描述",
    "steps": [
      {
        "id": "步骤ID",
        "description": "步骤描述",
        "action": "navigate | click | fill | check | select | custom",
        "target": "CSS选择器或XPath",
        "value": "输入值（如果需要）",
        "customScript": "自定义脚本（如果action为custom）",
        "screenshot": true/false
      }
    ],
    "tags": ["标签1", "标签2"]
  }
]

请生成至少3个测试用例，每个测试用例至少包含3个步骤。确保测试用例覆盖了需求文档中提到的所有功能。
`;
      } else if (testType === 'api') {
        prompt = `
你是一个专业的软件测试专家，请根据以下需求文档生成详细的API测试用例。
每个测试用例都应该有一个描述和详细的测试步骤，包括API路径、HTTP方法、请求参数和期望的响应。

需求文档:
${requirementsText}

请使用以下JSON格式生成测试用例:
[
  {
    "id": "生成一个唯一ID",
    "description": "测试用例描述",
    "steps": [
      {
        "id": "步骤ID",
        "description": "步骤描述",
        "action": "request",
        "target": "API路径",
        "value": "{ \"method\": \"GET/POST/PUT/DELETE\", \"headers\": {}, \"body\": {}, \"expectedStatus\": 200, \"expectedResponse\": {} }"
      }
    ],
    "tags": ["标签1", "标签2"]
  }
]

请生成至少3个测试用例，每个测试用例至少包含1个步骤。确保测试用例覆盖了需求文档中提到的所有API功能。
`;
      }

      // 调用Anthropic API
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        system: '你是一个专业的软件测试专家，擅长编写详细的测试用例。请只返回JSON格式的响应，不要添加任何额外的解释或Markdown格式。',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      } as any); // 添加类型断言，避免类型检查错误

      // 提取JSON响应
      let textContent = '';
      for (const content of (response.content as any[])) {
        if (content.type === 'text') {
          textContent += content.text;
        }
      }

      // 尝试解析JSON
      // 移除可能的Markdown代码块标记
      const jsonText = textContent.replace(/```json\s*|\s*```/g, '');
      const testCases = JSON.parse(jsonText);

      return testCases;
    } catch (error) {
      console.error('Error generating test cases using LLM:', error);
      // 出错时返回一个简单的测试用例
      return [{
        id: randomUUID(),
        description: 'Default test case (LLM generation failed)',
        steps: [{
          id: randomUUID(),
          description: 'Navigate to the home page',
          action: 'navigate',
          target: 'https://example.com',
        }],
        tags: ['default', 'error'],
      }];
    }
  }

  /**
   * 保存测试套件到文件
   * @param testSuite 测试套件
   */
  private saveTestSuite(testSuite: TestSuite): void {
    const filePath = path.join(this.storageDir, `${testSuite.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testSuite, null, 2));
  }

  /**
   * 加载所有测试套件
   */
  private loadTestSuites(): void {
    try {
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const testSuite = JSON.parse(fileContent) as TestSuite;
          this.testSuites.set(testSuite.id, testSuite);
        }
      }
    } catch (error) {
      console.warn('Error loading test suites:', error);
      // 继续执行，即使加载失败
    }
  }
}
