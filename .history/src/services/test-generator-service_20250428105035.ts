import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Anthropic } from "@anthropic-ai/sdk";
import { CoreTypes } from "../types/core";

export type TestType = "ui" | "api";

export class TestGeneratorService {
  private anthropic: Anthropic;
  private storageDir: string;

  constructor(storageDir?: string) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "dummy-key-replace-me",
    });

    this.storageDir = storageDir || path.join(process.cwd(), "test-suites");
    this.ensureDirectoryExists(this.storageDir);
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
      // Generate a unique ID for the test suite
      const testSuiteId = this.generateId();

      // Generate test cases using LLM
      const testSuite = await this.generateTestCasesUsingLLM(requirementsText, testType, apiSpec);

      if (!testSuite) {
        throw new Error("Failed to generate test cases");
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
      console.error("Error generating test cases from text:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error generating test cases",
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
      if (!fs.existsSync(documentPath)) {
        throw new Error(`Document not found at path: ${documentPath}`);
      }

      // Read the document content
      const requirementsText = fs.readFileSync(documentPath, "utf-8");

      // Generate test cases from the document content
      return this.generateFromText(requirementsText, testType, apiSpec);
    } catch (error) {
      console.error("Error generating test cases from document:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error generating test cases",
      };
    }
  }

  /**
   * Get test cases by test suite ID
   */
  public async getTestCases(testSuiteId: string): Promise<CoreTypes.TestSuite> {
    try {
      const filePath = path.join(this.storageDir, `${testSuiteId}.json`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Test suite not found with ID: ${testSuiteId}`);
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent) as CoreTypes.TestSuite;
    } catch (error) {
      console.error("Error getting test cases:", error);
      throw error;
    }
  }

  /**
   * Generate test cases using LLM (Anthropic Claude)
   * This is a simplified implementation for demonstration
   */
  private async generateTestCasesUsingLLM(
    requirementsText: string,
    testType: TestType,
    apiSpec?: string
  ): Promise<CoreTypes.TestSuite> {
    try {
      // Create a prompt for the LLM based on the requirements and test type
      let prompt = "";

      if (testType === "ui") {
        prompt = `
Human: Please generate a UI test suite based on the following requirements. Return as JSON with the following structure:
{
  "name": "Test Suite Name",
  "description": "Test Suite Description",
  "testCases": [
    {
      "id": "tc1",
      "name": "Test Case Name",
      "description": "Test Case Description",
      "steps": [
        {
          "id": "step1",
          "description": "Step Description",
          "action": "click|type|navigate|assert|wait",
          "selector": "CSS or XPath selector if applicable",
          "value": "Value to input if applicable",
          "expectedResult": "Expected result of this step"
        }
      ]
    }
  ]
}

Requirements:
${requirementsText}

Remember to create comprehensive test cases that cover both positive and negative scenarios.
`;
      } else if (testType === "api") {
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
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        system:
          "你是一个专业的软件测试专家，擅长编写详细的测试用例。请只返回JSON格式的响应，不要添加任何额外的解释或Markdown格式。",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      } as any); // 添加类型断言，避免类型检查错误

      // 提取JSON响应
      let textContent = "";
      for (const content of response.content as any[]) {
        if (content.type === "text") {
          textContent += content.text;
        }
      }

      // 尝试解析JSON
      // 移除可能的Markdown代码块标记
      const jsonText = textContent.replace(/```json\s*|\s*```/g, "");
      const testCases = JSON.parse(jsonText);

      // 创建测试套件
      const testSuite: CoreTypes.TestSuite = {
        id: crypto.randomUUID(),
        name: `Test Suite from Text - ${new Date().toLocaleString()}`,
        description: `Generated from text requirements: ${requirementsText.substring(0, 100)}...`,
        testCases: testCases,
        createdAt: Date.now(),
        type: testType,
      };

      return testSuite;
    } catch (error) {
      console.error("Error generating test cases using LLM:", error);
      // 出错时返回一个简单的测试用例
      return {
        id: crypto.randomUUID(),
        name: "Default test suite (LLM generation failed)",
        description: "Default test suite description",
        testCases: [
          {
            id: crypto.randomUUID(),
            description: "Default test case (LLM generation failed)",
            steps: [
              {
                id: crypto.randomUUID(),
                description: "Navigate to the home page",
                action: "navigate",
                target: "https://example.com",
              },
            ],
            tags: ["default", "error"],
          },
        ],
        createdAt: Date.now(),
        type: testType,
      };
    }
  }

  /**
   * 保存测试套件到文件
   * @param testSuite 测试套件
   */
  private saveTestSuite(testSuite: CoreTypes.TestSuite): void {
    const filePath = path.join(this.storageDir, `${testSuite.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testSuite, null, 2));
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
