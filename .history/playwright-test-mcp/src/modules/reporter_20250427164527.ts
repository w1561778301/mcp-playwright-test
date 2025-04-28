// Import types but ignore module resolution errors
// @ts-ignore
import * as fs from "fs";
// @ts-ignore
import * as path from "path";
import {
  ErrorReport,
  FrontendError,
  BackendError,
  ReportingOptions,
  NetworkRequest,
  ConsoleMessage,
  TestResults,
  APITestResult,
} from "../types";

/**
 * Reporter module for generating error reports
 */
export class ReporterModule {
  private options: ReportingOptions;

  constructor(options: ReportingOptions = {}) {
    this.options = {
      outputFormat: options.outputFormat || "json",
      outputPath: options.outputPath || "./reports",
      includeScreenshots: options.includeScreenshots || false,
      includeConsoleMessages: options.includeConsoleMessages || true,
      includeNetworkRequests: options.includeNetworkRequests || true,
    };
  }

  /**
   * Generate an error report from test results
   * @param testResults Test results
   * @param networkRequests Network requests captured during tests
   * @param consoleMessages Console messages captured during tests
   * @returns Generated error report
   */
  generateErrorReport(
    testResults: TestResults,
    networkRequests: NetworkRequest[],
    consoleMessages: ConsoleMessage[]
  ): ErrorReport {
    // Process frontend errors (from console messages)
    const frontendErrors: FrontendError[] = consoleMessages
      .filter((msg) => msg.type === "error")
      .map((msg) => ({
        message: msg.text,
        location: msg.location
          ? {
              file: msg.location.url,
              line: msg.location.lineNumber,
              column: msg.location.columnNumber,
            }
          : undefined,
        stack: msg.stack,
        timestamp: msg.timestamp,
        // Screenshot would be added here if available
      }));

    // Process backend errors (from network requests)
    const backendErrors: BackendError[] = networkRequests
      .filter((req) => req.response && req.response.status >= 400)
      .map((req) => ({
        apiEndpoint: req.url,
        method: req.method,
        status: req.response?.status || 0,
        statusText: req.response?.statusText || "",
        requestPayload: req.postData,
        responseBody: req.response?.body,
        timestamp: new Date(req.timestamp).toISOString(),
      }));

    // Create summary
    const summary = this.generateSummary(frontendErrors, backendErrors, testResults);

    // Create and return the report
    const report: ErrorReport = {
      frontendErrors,
      backendErrors,
      summary,
    };

    return report;
  }

  /**
   * Generate an error report from API test results
   * @param apiTestResults API test results
   * @returns Generated error report
   */
  generateAPIErrorReport(apiTestResults: APITestResult[]): ErrorReport {
    // Process backend errors from API test results
    const backendErrors: BackendError[] = [];

    for (const result of apiTestResults) {
      if (!result.passed) {
        // Create backend error entry from the available response data
        backendErrors.push({
          apiEndpoint: `API Test ${result.testCaseId}`, // Use testCaseId as identifier since endpoint is not available
          method: "API", // Generic method since the original method is not available in result
          status: result.response?.status || 0,
          statusText: result.response?.statusText || "",
          requestPayload: result.response?.body, // Body could be either request or response
          responseBody: result.response?.body,
          timestamp: result.response?.timestamp || new Date().toISOString(),
        });
      }
    }

    // Create summary
    const passedTests = apiTestResults.filter((tc) => tc.passed).length;
    const failedTests = apiTestResults.filter((tc) => !tc.passed).length;
    const summary = `API Test Results: ${passedTests} passed, ${failedTests} failed. Found ${backendErrors.length} API errors.`;

    // Create and return the report
    const report: ErrorReport = {
      frontendErrors: [],
      backendErrors,
      summary,
    };

    return report;
  }

  /**
   * Save the error report to file
   * @param report Error report to save
   * @param customPath Optional custom path to save the report
   * @returns Path to the saved report
   */
  saveReport(report: ErrorReport, customPath?: string): string {
    const outputPath = customPath || this.options.outputPath || "./reports";

    // Ensure directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `error-report-${timestamp}`;

    // Generate report in the specified format
    let reportContent: string;
    let extension: string;

    switch (this.options.outputFormat) {
      case "html":
        reportContent = this.generateHtmlReport(report);
        extension = "html";
        break;
      case "markdown":
        reportContent = this.generateMarkdownReport(report);
        extension = "md";
        break;
      case "json":
      default:
        reportContent = JSON.stringify(report, null, 2);
        extension = "json";
        break;
    }

    // Write to file
    const filepath = path.join(outputPath, `${filename}.${extension}`);
    fs.writeFileSync(filepath, reportContent);

    return filepath;
  }

  /**
   * Generate a summary of the errors
   * @param frontendErrors Frontend errors
   * @param backendErrors Backend errors
   * @param testResults Test results
   * @returns Summary string
   */
  private generateSummary(
    frontendErrors: FrontendError[],
    backendErrors: BackendError[],
    testResults: TestResults
  ): string {
    // Count passed and failed tests
    const passedTests = testResults.testCases.filter((tc) => tc.passed).length;
    const failedTests = testResults.testCases.filter((tc) => !tc.passed).length;

    return `Test Results: ${passedTests} passed, ${failedTests} failed. Found ${frontendErrors.length} frontend errors and ${backendErrors.length} backend errors.`;
  }

  /**
   * Generate HTML report
   * @param report Error report
   * @returns HTML content
   */
  private generateHtmlReport(report: ErrorReport): string {
    // In a real implementation, you'd use a template engine or more sophisticated HTML generation
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Error Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2, h3 { color: #333; }
    .summary { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
    .error { background: #fff0f0; padding: 10px; margin-bottom: 10px; border-left: 4px solid #ff0000; }
    .details { margin-left: 20px; }
    pre { background: #f0f0f0; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Test Error Report</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p>${report.summary}</p>
  </div>

  <h2>Frontend Errors (${report.frontendErrors.length})</h2>
  ${report.frontendErrors
    .map(
      (err) => `
    <div class="error">
      <h3>${this.escapeHtml(err.message)}</h3>
      <div class="details">
        ${
          err.location
            ? `<p>Location: ${this.escapeHtml(err.location.file)} (line ${err.location.line}, column ${
                err.location.column
              })</p>`
            : ""
        }
        ${err.timestamp ? `<p>Timestamp: ${this.escapeHtml(err.timestamp)}</p>` : ""}
        ${err.stack ? `<pre>${this.escapeHtml(err.stack)}</pre>` : ""}
      </div>
    </div>
  `
    )
    .join("")}

  <h2>Backend Errors (${report.backendErrors.length})</h2>
  ${report.backendErrors
    .map(
      (err) => `
    <div class="error">
      <h3>${this.escapeHtml(err.method)} ${this.escapeHtml(err.apiEndpoint)} - ${err.status} ${this.escapeHtml(
        err.statusText
      )}</h3>
      <div class="details">
        <p>Timestamp: ${this.escapeHtml(err.timestamp)}</p>
        ${
          err.requestPayload
            ? `
          <h4>Request Payload:</h4>
          <pre>${this.escapeHtml(
            typeof err.requestPayload === "string" ? err.requestPayload : JSON.stringify(err.requestPayload, null, 2)
          )}</pre>
        `
            : ""
        }
        ${
          err.responseBody
            ? `
          <h4>Response Body:</h4>
          <pre>${this.escapeHtml(
            typeof err.responseBody === "string" ? err.responseBody : JSON.stringify(err.responseBody, null, 2)
          )}</pre>
        `
            : ""
        }
      </div>
    </div>
  `
    )
    .join("")}
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate Markdown report
   * @param report Error report
   * @returns Markdown content
   */
  private generateMarkdownReport(report: ErrorReport): string {
    let markdown = `# Test Error Report

## Summary
${report.summary}

## Frontend Errors (${report.frontendErrors.length})
${report.frontendErrors
  .map(
    (err) => `
### Error: ${err.message}
${err.location ? `**Location:** ${err.location.file} (line ${err.location.line}, column ${err.location.column})` : ""}
${err.timestamp ? `**Timestamp:** ${err.timestamp}` : ""}
${err.stack ? `\`\`\`\n${err.stack}\n\`\`\`` : ""}
`
  )
  .join("---\n")}

## Backend Errors (${report.backendErrors.length})
${report.backendErrors
  .map(
    (err) => `
### ${err.method} ${err.apiEndpoint} - ${err.status} ${err.statusText}
**Timestamp:** ${err.timestamp}
${
  err.requestPayload
    ? `
#### Request Payload:
\`\`\`json
${typeof err.requestPayload === "string" ? err.requestPayload : JSON.stringify(err.requestPayload, null, 2)}
\`\`\`
`
    : ""
}
${
  err.responseBody
    ? `
#### Response Body:
\`\`\`json
${typeof err.responseBody === "string" ? err.responseBody : JSON.stringify(err.responseBody, null, 2)}
\`\`\`
`
    : ""
}
`
  )
  .join("---\n")}
`;

    return markdown;
  }

  /**
   * Escape HTML special characters
   * @param text Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: any): string {
    if (text === null || text === undefined) {
      return "";
    }

    if (typeof text !== "string") {
      text = String(text);
    }

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
