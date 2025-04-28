import * as fs from "fs";
import * as path from "path";
import { TestCase, TestStep, TestGenerationOptions } from "../types";

/**
 * Test Generator module for creating tests from requirements
 */
export class TestGeneratorModule {
  private options: TestGenerationOptions;

  constructor(options: TestGenerationOptions = {}) {
    this.options = {
      promptTemplate: options.promptTemplate || "Generate test cases for the following requirements: {requirements}",
      maxTestCases: options.maxTestCases || 10,
      includeScreenshots: options.includeScreenshots || false,
      screenshotOnFailure: options.screenshotOnFailure || true,
    };
  }

  /**
   * Generate test cases from text requirements
   * @param requirementsText Text containing requirements
   * @returns Array of generated test cases
   */
  async generateFromText(requirementsText: string): Promise<TestCase[]> {
    // In a real implementation, this would call an NLP service or LLM API
    // to generate test cases from the requirements

    // Here's a simplified implementation
    const testCases: TestCase[] = [];

    // Analyze the requirements text
    const requirements = this.extractRequirements(requirementsText);

    // Generate test cases for each requirement (up to max)
    for (const requirement of requirements.slice(0, this.options.maxTestCases)) {
      const testCase = this.generateSingleTestCase(requirement);
      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Generate test cases from a document file
   * @param documentPath Path to requirements document
   * @returns Array of generated test cases
   */
  async generateFromDocument(documentPath: string): Promise<TestCase[]> {
    if (!fs.existsSync(documentPath)) {
      throw new Error(`Document does not exist: ${documentPath}`);
    }

    // Read the document file
    const content = fs.readFileSync(documentPath, "utf-8");

    // Delegate to text-based generation
    return this.generateFromText(content);
  }

  /**
   * Extract individual requirements from text
   * @param text Requirements text
   * @returns Array of requirement strings
   */
  private extractRequirements(text: string): string[] {
    // Simple parsing logic to extract individual requirements
    // In practice, this would be more sophisticated

    // First, split by common requirement delimiters
    let requirements: string[] = [];

    // Try to split by numbered requirements (1. 2. etc.)
    const numberedRequirements = text.split(/\n\s*\d+\.\s*/);
    if (numberedRequirements.length > 1) {
      // Remove the text before the first number
      requirements = numberedRequirements.slice(1);
    } else {
      // Try to split by bullet points
      const bulletRequirements = text.split(/\n\s*[\-\*•]\s*/);
      if (bulletRequirements.length > 1) {
        requirements = bulletRequirements.slice(1);
      } else {
        // Fall back to splitting by lines/paragraphs
        requirements = text
          .split(/\n+/)
          .filter((line) => line.trim().length > 0)
          .filter((line) => !line.startsWith("#"));
      }
    }

    // Clean up each requirement
    return requirements.map((req) => req.trim()).filter((req) => req.length > 0);
  }

  /**
   * Generate a single test case from a requirement
   * @param requirement Requirement text
   * @returns Generated test case
   */
  private generateSingleTestCase(requirement: string): TestCase {
    // This is where you'd integrate with an LLM or similar service
    // For this example, we'll create a simple test case based on keywords

    const testId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const description = `Test for: ${requirement}`;
    const steps: TestStep[] = [];

    // Very basic keyword matching for common UI patterns
    if (requirement.toLowerCase().includes("login") || requirement.toLowerCase().includes("sign in")) {
      steps.push(
        { action: "navigate", target: "/login" },
        { action: "fill", target: 'input[name="username"]', value: "testuser" },
        { action: "fill", target: 'input[name="password"]', value: "password123" },
        { action: "click", target: 'button[type="submit"]' },
        // Verify successful login
        { action: "custom", customScript: 'return document.body.innerText.includes("Welcome")' }
      );
    } else if (requirement.toLowerCase().includes("search")) {
      steps.push(
        { action: "navigate", target: "/" },
        { action: "fill", target: 'input[type="search"]', value: "test query" },
        { action: "click", target: 'button[aria-label="Search"]' },
        // Verify search results
        { action: "custom", customScript: 'return document.querySelector(".search-results") !== null' }
      );
    } else if (requirement.toLowerCase().includes("form") || requirement.toLowerCase().includes("submit")) {
      steps.push(
        { action: "navigate", target: "/form" },
        { action: "fill", target: 'input[name="name"]', value: "Test User" },
        { action: "fill", target: 'input[name="email"]', value: "test@example.com" },
        { action: "check", target: 'input[type="checkbox"]' },
        { action: "click", target: 'button[type="submit"]' },
        // Verify form submission
        { action: "custom", customScript: 'return document.body.innerText.includes("Thank you")' }
      );
    } else if (requirement.toLowerCase().includes("navigation") || requirement.toLowerCase().includes("menu")) {
      steps.push(
        { action: "navigate", target: "/" },
        { action: "click", target: 'button[aria-label="Menu"]' },
        { action: "click", target: ".menu-item" },
        // Verify navigation worked
        { action: "custom", customScript: 'return window.location.pathname !== "/"' }
      );
    } else {
      // Default case for general requirements
      steps.push(
        { action: "navigate", target: "/" },
        { action: "click", target: 'a[href*="' + requirement.split(" ")[0].toLowerCase() + '"]' }
      );
    }

    return {
      id: testId,
      description,
      steps,
    };
  }

  /**
   * Convert test cases to executable Playwright script
   * @param testCases Array of test cases
   * @param outputPath Path to save generated script
   * @returns Path to the generated script
   */
  async generatePlaywrightScript(testCases: TestCase[], outputPath: string): Promise<string> {
    let scriptContent = `
import { test, expect } from '@playwright/test';

// Automatically generated test script
// Generated at: ${new Date().toISOString()}

`;

    for (const testCase of testCases) {
      scriptContent += `
test('${testCase.description.replace(/'/g, "\\'")}', async ({ page }) => {
  // Test ID: ${testCase.id}
${this.generateTestSteps(testCase.steps)}
});
`;
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(outputPath, scriptContent);

    return outputPath;
  }

  /**
   * Generate Playwright script for test steps
   * @param steps Array of test steps
   * @returns Generated script content
   */
  private generateTestSteps(steps: TestStep[]): string {
    let script = "";

    for (const step of steps) {
      switch (step.action) {
        case "navigate":
          script += `  await page.goto('${step.target}');\n`;
          break;
        case "click":
          script += `  await page.click('${step.target}');\n`;
          break;
        case "fill":
          script += `  await page.fill('${step.target}', '${step.value}');\n`;
          break;
        case "check":
          script += `  await page.check('${step.target}');\n`;
          break;
        case "select":
          script += `  await page.selectOption('${step.target}', '${step.value}');\n`;
          break;
        case "custom":
          if (step.customScript) {
            script += `  const result = await page.evaluate(() => { ${step.customScript} });\n`;
            script += `  expect(result).toBeTruthy();\n`;
          }
          break;
      }
    }

    return script;
  }
}
