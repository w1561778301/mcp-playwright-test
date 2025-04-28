import {
  PlaywrightTestSDK,
  SDKOptions,
  GitOptions,
  GitCredentials,
  BrowserOptions,
  TestCase,
  TestResults,
  NetworkRequest,
  ConsoleMessage,
  ErrorReport,
  APITestCase,
  APITestResult,
  APIResponse,
  APITestingOptions,
} from "./types";
import { GitModule } from "./modules/git";
import { BrowserModule } from "./modules/browser";
import { TestGeneratorModule } from "./modules/testGenerator";
import { DebuggerModule } from "./modules/debugger";
import { ReporterModule } from "./modules/reporter";
import { APITestingModule } from "./modules/apiTesting";

/**
 * Main SDK implementation for Playwright MCP testing
 */
export class PlaywrightMCPTestSDK implements PlaywrightTestSDK {
  private options: SDKOptions = {};
  private gitModule: GitModule;
  private browserModule: BrowserModule;
  private testGeneratorModule: TestGeneratorModule;
  private debuggerModule: DebuggerModule;
  private reporterModule: ReporterModule;
  private apiTestingModule: APITestingModule;
  private testCases: TestCase[] = [];
  private apiTestCases: APITestCase[] = [];
  private testResults: TestResults | null = null;
  private apiTestResults: APITestResult[] | null = null;

  /**
   * Create a new instance of the Playwright MCP Test SDK
   * @param options Configuration options
   */
  constructor(options: SDKOptions = {}) {
    this.options = options;

    // Initialize modules
    this.gitModule = new GitModule(options.gitOptions);
    this.browserModule = new BrowserModule(options.browserOptions, options.mcpOptions);
    this.testGeneratorModule = new TestGeneratorModule(options.testGenerationOptions);
    this.debuggerModule = new DebuggerModule();
    this.reporterModule = new ReporterModule(options.reportingOptions);
    this.apiTestingModule = new APITestingModule(options.apiTestingOptions);
  }

  /**
   * Configure the SDK with options
   * @param options SDK options
   * @returns SDK instance for chaining
   */
  configure(options: SDKOptions): PlaywrightTestSDK {
    this.options = { ...this.options, ...options };

    // Update module options if provided
    if (options.gitOptions) {
      this.gitModule = new GitModule(options.gitOptions);
    }

    if (options.browserOptions || options.mcpOptions) {
      this.browserModule = new BrowserModule(
        options.browserOptions || this.options.browserOptions,
        options.mcpOptions || this.options.mcpOptions
      );
    }

    if (options.testGenerationOptions) {
      this.testGeneratorModule = new TestGeneratorModule(options.testGenerationOptions);
    }

    if (options.reportingOptions) {
      this.reporterModule = new ReporterModule(options.reportingOptions);
    }

    if (options.apiTestingOptions) {
      this.apiTestingModule = new APITestingModule(options.apiTestingOptions);
    }

    return this;
  }

  /**
   * Clone a Git repository
   * @param url Repository URL
   * @param credentials Git credentials
   */
  async cloneRepository(url: string, credentials?: GitCredentials): Promise<void> {
    const projectPath = await this.gitModule.cloneRepository(url, credentials);
    this.browserModule.setProjectPath(projectPath);
  }

  /**
   * Use a local project
   * @param path Path to local project
   */
  async useLocalProject(path: string): Promise<void> {
    const projectPath = await this.gitModule.useLocalProject(path);
    this.browserModule.setProjectPath(projectPath);
  }

  /**
   * Launch browser for testing
   * @param options Browser options
   */
  async launchBrowser(options?: BrowserOptions): Promise<void> {
    await this.browserModule.launchBrowser(options);

    // Set up the debugger with the page
    const page = this.browserModule.getPage();
    if (page) {
      this.debuggerModule.setPage(page);
      this.debuggerModule.startConsoleCapture();
      await this.debuggerModule.startNetworkCapture();
    }
  }

  /**
   * Set up MCP server
   */
  async setupMCPServer(): Promise<void> {
    await this.browserModule.setupMCPServer();
  }

  /**
   * Start the frontend project
   */
  async startFrontendProject(): Promise<void> {
    await this.browserModule.startFrontendProject();
  }

  /**
   * Generate test cases from requirements text
   * @param requirementsText Requirements text
   * @returns Generated test cases
   */
  async generateTestsFromRequirements(requirementsText: string): Promise<TestCase[]> {
    this.testCases = await this.testGeneratorModule.generateFromText(requirementsText);
    return this.testCases;
  }

  /**
   * Generate test cases from a document file
   * @param documentPath Path to requirements document
   * @returns Generated test cases
   */
  async generateTestsFromDocument(documentPath: string): Promise<TestCase[]> {
    this.testCases = await this.testGeneratorModule.generateFromDocument(documentPath);
    return this.testCases;
  }

  /**
   * Generate API test cases from OpenAPI specification
   * @param specPath Path to OpenAPI specification file
   * @returns Generated API test cases
   */
  async generateAPITestsFromSpec(specPath: string): Promise<APITestCase[]> {
    this.apiTestCases = await this.apiTestingModule.generateAPITestsFromSpec(specPath);
    return this.apiTestCases;
  }

  /**
   * Run test cases
   * @param testCases Test cases to run
   * @returns Test results
   */
  async runTests(testCases: TestCase[]): Promise<TestResults> {
    const page = this.browserModule.getPage();
    if (!page) {
      throw new Error("Browser not launched. Call launchBrowser() first.");
    }

    // Save test cases for later use
    this.testCases = testCases;

    // Reset results
    const results: TestResults = {
      passed: true,
      testCases: [],
      networkRequests: [],
      consoleMessages: [],
    };

    // Run each test case
    for (const testCase of testCases) {
      console.log(`Running test: ${testCase.description}`);

      const startTime = Date.now();
      let passed = true;
      const errors: Error[] = [];
      const screenshots: string[] = [];

      try {
        // Execute each step in the test case
        for (const step of testCase.steps) {
          console.log(`- Step: ${step.action} ${step.target || ""}`);

          switch (step.action) {
            case "navigate":
              await page.goto(step.target || "");
              break;

            case "click":
              await page.click(step.target || "");
              break;

            case "fill":
              await page.fill(step.target || "", step.value || "");
              break;

            case "check":
              await page.check(step.target || "");
              break;

            case "select":
              await page.selectOption(step.target || "", step.value || "");
              break;

            case "custom":
              if (step.customScript) {
                const result = await page.evaluate(step.customScript);
                if (!result) {
                  throw new Error(`Custom assertion failed: ${step.customScript}`);
                }
              }
              break;
          }

          // Wait a bit for the action to complete
          await page.waitForTimeout(500);
        }
      } catch (error) {
        passed = false;
        errors.push(error as Error);

        // Take a screenshot on failure
        const screenshot = await page.screenshot({ type: "png" });
        screenshots.push(screenshot.toString("base64"));

        console.error(`Test failed: ${(error as Error).message}`);
      }

      const endTime = Date.now();

      // Add result for this test case
      results.testCases.push({
        testCaseId: testCase.id,
        passed,
        duration: endTime - startTime,
        errors,
        screenshots,
      });

      // Update overall passed status
      if (!passed) {
        results.passed = false;
      }
    }

    // Collect network requests and console messages
    results.networkRequests = this.debuggerModule.getNetworkRequests();
    results.consoleMessages = this.debuggerModule.getConsoleMessages();

    // Save results for later reporting
    this.testResults = results;

    return results;
  }

  /**
   * Run API test cases
   * @param testCases API test cases to run
   * @returns API test results
   */
  async runAPITests(testCases: APITestCase[]): Promise<APITestResult[]> {
    // Save test cases for later use
    this.apiTestCases = testCases;

    // Run API tests
    const results = await this.apiTestingModule.runAPITests(testCases);

    // Save results for later reporting
    this.apiTestResults = results;

    return results;
  }

  /**
   * Mock API endpoints for testing
   * @param endpoint API endpoint path
   * @param method HTTP method
   * @param response Mock response
   */
  mockAPIEndpoint(endpoint: string, method: string, response: APIResponse): void {
    this.apiTestingModule.mockAPIEndpoint(endpoint, method, response);
  }

  /**
   * Start API mock server
   */
  async startMockServer(): Promise<void> {
    // Configure mock server if not already enabled
    if (!this.options.apiTestingOptions?.enableMocking) {
      this.apiTestingModule = new APITestingModule({
        ...this.options.apiTestingOptions,
        enableMocking: true,
      });
    }
  }

  /**
   * Stop API mock server
   */
  async stopMockServer(): Promise<void> {
    await this.apiTestingModule.stopMockServer();
  }

  /**
   * Capture network requests during test execution
   * @returns Array of network requests
   */
  async captureNetworkRequests(): Promise<NetworkRequest[]> {
    return this.debuggerModule.getNetworkRequests();
  }

  /**
   * Capture console messages during test execution
   * @returns Array of console messages
   */
  async captureConsoleMessages(): Promise<ConsoleMessage[]> {
    return this.debuggerModule.getConsoleMessages();
  }

  /**
   * Generate an error report from test results
   * @returns Error report
   */
  async generateErrorReport(): Promise<ErrorReport> {
    if (!this.testResults) {
      throw new Error("No test results available. Run tests first.");
    }

    const networkRequests = await this.captureNetworkRequests();
    const consoleMessages = await this.captureConsoleMessages();

    return this.reporterModule.generateErrorReport(this.testResults, networkRequests, consoleMessages);
  }

  /**
   * Generate an error report from API test results
   * @returns Error report
   */
  async generateAPIErrorReport(): Promise<ErrorReport> {
    if (!this.apiTestResults) {
      throw new Error("No API test results available. Run API tests first.");
    }

    return this.reporterModule.generateAPIErrorReport(this.apiTestResults);
  }

  /**
   * Save the error report to file
   * @param report Error report
   * @param outputPath Custom output path
   * @returns Path to saved report
   */
  async saveErrorReport(report: ErrorReport, outputPath?: string): Promise<string> {
    return this.reporterModule.saveReport(report, outputPath);
  }

  /**
   * Generate and save test scripts from test cases
   * @param outputPath Path to save the script
   * @returns Path to the generated script
   */
  async generateTestScript(outputPath: string): Promise<string> {
    if (!this.testCases || this.testCases.length === 0) {
      throw new Error("No test cases available. Generate tests first.");
    }

    return this.testGeneratorModule.generatePlaywrightScript(this.testCases, outputPath);
  }

  /**
   * Clean up all resources
   */
  async close(): Promise<void> {
    await this.debuggerModule.cleanup();
    await this.browserModule.close();
    await this.gitModule.cleanup();
    await this.apiTestingModule.cleanup();
  }
}

// Export types
export * from "./types";

// Export default instance
export default PlaywrightMCPTestSDK;
