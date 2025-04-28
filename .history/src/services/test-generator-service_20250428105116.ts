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
  ): Promise<CoreTypes.TestSuite | null> {
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
Human: Please generate an API test suite based on the following requirements. Return as JSON with the following structure:
{
  "name": "API Test Suite Name",
  "description": "API Test Suite Description",
  "testCases": [
    {
      "id": "tc1",
      "name": "API Test Case Name",
      "description": "API Test Case Description",
      "steps": [
        {
          "id": "step1",
          "description": "Step Description",
          "action": "request",
          "method": "GET|POST|PUT|DELETE",
          "endpoint": "/api/endpoint",
          "headers": {"Content-Type": "application/json"},
          "body": "Request body if applicable",
          "expectedStatus": 200,
          "expectedResponse": "Expected response pattern"
        }
      ]
    }
  ]
}

Requirements:
${requirementsText}
${apiSpec ? `\n\nAPI Specification:\n${apiSpec}` : ""}

Remember to create comprehensive test cases that cover both positive and negative scenarios.
`;
      }

      // Call the Anthropic API to generate test cases
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        system:
          "You are a test automation expert. Generate comprehensive test cases in JSON format only. Do not include any explanations or markdown, just the JSON object.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Extract the test suite from the response
      let testSuiteJson = "";
      for (const content of response.content) {
        if (content.type === "text") {
          testSuiteJson += content.text;
        }
      }

      // Clean up the response to extract only JSON
      testSuiteJson = testSuiteJson.replace(/```json\s*|\s*```/g, "");

      // Parse the JSON response
      const testSuiteData = JSON.parse(testSuiteJson);

      // Create a test suite object
      const testSuite: CoreTypes.TestSuite = {
        id: this.generateId(),
        name: testSuiteData.name || `Test Suite - ${new Date().toLocaleString()}`,
        description: testSuiteData.description || `Generated from requirements`,
        testCases: testSuiteData.testCases || [],
        createdAt: Date.now(),
        type: testType,
      };

      return testSuite;
    } catch (error) {
      console.error("Error generating test cases using LLM:", error);
      return null;
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
  private async saveTestSuite(testSuite: CoreTypes.TestSuite): Promise<void> {
    const filePath = path.join(this.storageDir, `${testSuite.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testSuite, null, 2));
  }
}
