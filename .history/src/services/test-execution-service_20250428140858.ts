import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { PlaywrightService } from "./playwright-service";
import * as core from "../types/core";

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  duration: number;
  errors?: Error[];
  screenshots?: string[];
}

export interface TestResults {
  id: string;
  testSuiteId: string;
  passed: boolean;
  testCases: TestCaseResult[];
  networkRequests: any[];
  consoleMessages: any[];
  startTime: string;
  endTime: string;
  duration: number;
}

export interface ErrorReport {
  id: string;
  frontendErrors: FrontendError[];
  backendErrors: BackendError[];
  summary: string;
  timestamp: string;
}

export interface FrontendError {
  message: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  stack?: string;
  timestamp: string;
  screenshot?: string;
}

export interface BackendError {
  apiEndpoint: string;
  method: string;
  status: number;
  statusText: string;
  requestPayload?: any;
  responseBody?: any;
  timestamp: string;
}

export class TestExecutionService {
  private playwrightService: PlaywrightService;
  private testResults: Map<string, TestResults> = new Map();
  private errorReports: Map<string, ErrorReport> = new Map();
  private storageDir: string;

  constructor(playwrightService: PlaywrightService, storageDir?: string) {
    this.playwrightService = playwrightService;

    // 初始化存储目录
    this.storageDir = storageDir || path.join(process.cwd(), "test-results");
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // 创建截图目录
    const screenshotsDir = path.join(this.storageDir, "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 加载现有测试结果
    this.loadTestResults();
  }

  /**
   * 运行测试用例
   * @param testSuiteId 测试套件ID
   * @returns 测试结果ID
   */
  async runTests(testSuiteId: string): Promise<string> {
    try {
      // 加载测试套件
      const testSuitePath = path.join(process.cwd(), "test-suites", `${testSuiteId}.json`);

      if (!fs.existsSync(testSuitePath)) {
        throw new Error(`Test suite not found: ${testSuiteId}`);
      }

      const testSuiteContent = fs.readFileSync(testSuitePath, "utf-8");
      const testSuite = JSON.parse(testSuiteContent) as core.TestSuite;

      // 确保浏览器已启动
      const browserIsRunning = !!this.playwrightService.getPage();
      if (!browserIsRunning) {
        await this.playwrightService.launchBrowser();
      }

      // 清除之前的控制台日志和网络请求
      this.playwrightService.clearConsoleLogs();
      this.playwrightService.clearNetworkRequests();

      // 创建测试结果ID
      const resultId = randomUUID();
      const startTime = new Date();

      // 执行每个测试用例
      const testCaseResults: TestCaseResult[] = [];

      for (const testCase of testSuite.testCases) {
        console.log(`Running test case: ${testCase.description}`);

        const testCaseStartTime = Date.now();
        let passed = true;
        const errors: Error[] = [];
        const screenshots: string[] = [];

        try {
          // 执行测试用例的每个步骤
          for (const step of testCase.steps) {
            console.log(`- Step: ${step.action} ${step.target || ""}`);

            const page = this.playwrightService.getPage();
            if (!page) {
              throw new Error("Browser page not initialized");
            }

            // 根据步骤类型执行不同的操作
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
                  // 执行自定义JavaScript
                  const result = await page.evaluate(step.customScript);
                  if (!result) {
                    throw new Error(`Custom assertion failed: ${step.customScript}`);
                  }
                }
                break;

              case "request":
                // API请求测试处理
                if (step.value) {
                  try {
                    const requestData = JSON.parse(step.value);

                    // 使用fetch API执行请求
                    const response = await page.evaluate(
                      async ({ url, method, headers, body }) => {
                        const response = await fetch(url, {
                          method,
                          headers,
                          body: body ? JSON.stringify(body) : undefined,
                        });

                        return {
                          status: response.status,
                          statusText: response.statusText,
                          headers: Object.fromEntries([...response.headers]),
                          body: await response.text(),
                        };
                      },
                      {
                        url: step.target,
                        method: requestData.method,
                        headers: requestData.headers,
                        body: requestData.body,
                      }
                    );

                    // 验证状态码
                    if (requestData.expectedStatus && response.status !== requestData.expectedStatus) {
                      throw new Error(`Expected status ${requestData.expectedStatus}, got ${response.status}`);
                    }

                    // 验证响应体（如果期望的响应体存在）
                    if (requestData.expectedResponse) {
                      try {
                        const responseBody = JSON.parse(response.body);
                        // 这里应该有更复杂的响应体验证逻辑
                        // 目前只是简单地验证响应体不为空
                        if (!responseBody) {
                          throw new Error("Response body is empty");
                        }
                      } catch (error) {
                        throw new Error(`Invalid JSON response: ${response.body}`);
                      }
                    }
                  } catch (error) {
                    throw new Error(`API request failed: ${(error as Error).message}`);
                  }
                }
                break;

              default:
                console.warn(`Unknown step action: ${step.action}`);
            }

            // 每个步骤后等待一段时间以确保页面已响应
            await page.waitForTimeout(500);

            // 如果需要截图，则捕获当前步骤的截图
            if (step.screenshot) {
              const screenshotPath = path.join(this.storageDir, "screenshots", `${testCase.id}_${step.id}.png`);
              await page.screenshot({ path: screenshotPath });
              screenshots.push(screenshotPath);
            }
          }
        } catch (error) {
          passed = false;
          errors.push(error as Error);

          // 测试失败时捕获截图
          try {
            const page = this.playwrightService.getPage();
            if (page) {
              const screenshotPath = path.join(this.storageDir, "screenshots", `${testCase.id}_failure.png`);
              await page.screenshot({ path: screenshotPath });
              screenshots.push(screenshotPath);
            }
          } catch (screenshotError) {
            console.error("Error capturing failure screenshot:", screenshotError);
          }

          console.error(`Test failed: ${(error as Error).message}`);
        }

        // 记录测试用例结果
        const testCaseEndTime = Date.now();
        const duration = testCaseEndTime - testCaseStartTime;

        testCaseResults.push({
          testCaseId: testCase.id,
          passed,
          duration,
          errors: errors.length > 0 ? errors : undefined,
          screenshots: screenshots.length > 0 ? screenshots : undefined,
        });
      }

      // 计算总体测试结果
      const endTime = new Date();
      const allPassed = testCaseResults.every((result) => result.passed);

      // 获取网络请求和控制台消息
      const networkRequests = await this.playwrightService.getNetworkRequests();
      const consoleMessages = await this.playwrightService.getConsoleLogs();

      // 创建测试结果
      const testResults: TestResults = {
        id: resultId,
        testSuiteId,
        passed: allPassed,
        testCases: testCaseResults,
        networkRequests,
        consoleMessages,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      };

      // 保存测试结果
      this.testResults.set(resultId, testResults);
      this.saveTestResults(testResults);

      return resultId;
    } catch (error) {
      console.error("Error running tests:", error);
      throw new Error(`Failed to run tests: ${(error as Error).message}`);
    }
  }

  /**
   * 获取测试报告
   * @param reportId 报告ID
   * @returns 测试结果或错误报告
   */
  async getReport(reportId: string): Promise<TestResults | ErrorReport> {
    // 先检查是否是测试结果
    const testResults = this.testResults.get(reportId);
    if (testResults) {
      return testResults;
    }

    // 检查是否是错误报告
    const errorReport = this.errorReports.get(reportId);
    if (errorReport) {
      return errorReport;
    }

    throw new Error(`Report not found: ${reportId}`);
  }

  /**
   * 生成错误报告
   * @returns 错误报告ID
   */
  async generateErrorReport(): Promise<string> {
    try {
      // 确保浏览器已启动
      const browserIsRunning = !!this.playwrightService.getPage();
      if (!browserIsRunning) {
        throw new Error("Browser is not running. Launch browser first.");
      }

      // 创建错误报告ID
      const reportId = randomUUID();

      // 获取控制台日志和网络请求
      const consoleMessages = await this.playwrightService.getConsoleLogs();
      const networkRequests = await this.playwrightService.getNetworkRequests();

      // 处理前端错误（从控制台日志中提取）
      const frontendErrors = consoleMessages
        .filter((message) => message.type === "error")
        .map((message) => {
          const frontendError: FrontendError = {
            message: message.text,
            timestamp: message.timestamp,
          };

          if (message.location) {
            frontendError.location = {
              file: message.location.url,
              line: message.location.lineNumber,
              column: message.location.columnNumber,
            };
          }

          if (message.stack) {
            frontendError.stack = message.stack;
          }

          return frontendError;
        });

      // 处理后端错误（从网络请求中提取）
      const backendErrors = networkRequests
        .filter((request) => request.response && request.response.status >= 400)
        .map((request) => {
          const backendError: BackendError = {
            apiEndpoint: request.url,
            method: request.method,
            status: request.response!.status,
            statusText: request.response!.statusText,
            requestPayload: request.postData,
            responseBody: request.response!.body,
            timestamp: new Date(request.timestamp).toISOString(),
          };

          return backendError;
        });

      // 生成摘要
      let summary = `Error Report - ${new Date().toLocaleString()}\n`;

      summary += `\nFrontend Errors: ${frontendErrors.length}\n`;
      frontendErrors.forEach((error, index) => {
        summary += `${index + 1}. ${error.message}\n`;
        if (error.location) {
          summary += `   at ${error.location.file}:${error.location.line}:${error.location.column}\n`;
        }
      });

      summary += `\nBackend Errors: ${backendErrors.length}\n`;
      backendErrors.forEach((error, index) => {
        summary += `${index + 1}. ${error.method} ${error.apiEndpoint} - ${error.status} ${error.statusText}\n`;
      });

      // 创建错误报告
      const errorReport: ErrorReport = {
        id: reportId,
        frontendErrors,
        backendErrors,
        summary,
        timestamp: new Date().toISOString(),
      };

      // 保存错误报告
      this.errorReports.set(reportId, errorReport);
      this.saveErrorReport(errorReport);

      return reportId;
    } catch (error) {
      console.error("Error generating error report:", error);
      throw new Error(`Failed to generate error report: ${(error as Error).message}`);
    }
  }

  /**
   * 保存测试结果
   * @param testResults 测试结果
   */
  private saveTestResults(testResults: TestResults): void {
    const filePath = path.join(this.storageDir, `result_${testResults.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testResults, null, 2));
  }

  /**
   * 保存错误报告
   * @param errorReport 错误报告
   */
  private saveErrorReport(errorReport: ErrorReport): void {
    const filePath = path.join(this.storageDir, `error_${errorReport.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(errorReport, null, 2));
  }

  /**
   * 加载所有测试结果
   */
  private loadTestResults(): void {
    try {
      const files = fs.readdirSync(this.storageDir);

      for (const file of files) {
        if (file.startsWith("result_") && file.endsWith(".json")) {
          const filePath = path.join(this.storageDir, file);
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const testResults = JSON.parse(fileContent) as TestResults;
          this.testResults.set(testResults.id, testResults);
        } else if (file.startsWith("error_") && file.endsWith(".json")) {
          const filePath = path.join(this.storageDir, file);
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const errorReport = JSON.parse(fileContent) as ErrorReport;
          this.errorReports.set(errorReport.id, errorReport);
        }
      }
    } catch (error) {
      console.warn("Error loading test results:", error);
      // 继续执行，即使加载失败
    }
  }
}
