import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Anthropic } from "@anthropic-ai/sdk";

export type TestType = "ui" | "api";

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
  public async getTestCases(testSuiteId: string): Promise<TestSuite> {
    try {
      const filePath = path.join(this.storageDir, `${testSuiteId}.json`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Test suite not found with ID: ${testSuiteId}`);
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent) as TestSuite;
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
  ): Promise<TestSuite> {
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
      }

      // Generate test cases using LLM
      const response = await this.anthropic.generateText(prompt);

      if (!response || !response.data || !response.data.text) {
        throw new Error("Failed to generate test cases using LLM");
      }

      const testSuite = JSON.parse(response.data.text) as TestSuite;

      return testSuite;
    } catch (error) {
      console.error("Error generating test cases using LLM:", error);
      return null;
    }
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async saveTestSuite(testSuite: TestSuite): Promise<void> {
    const filePath = path.join(this.storageDir, `${testSuite.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testSuite));
  }
}
