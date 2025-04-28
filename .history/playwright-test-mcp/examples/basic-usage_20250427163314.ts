import PlaywrightMCPTestSDK from '../src';

/**
 * Basic example of using the Playwright MCP Test SDK
 */
async function main() {
  // Create a new instance of the SDK
  const sdk = new PlaywrightMCPTestSDK({
    // Git options for repository access
    gitOptions: {
      depth: 1
    },
    // Browser options
    browserOptions: {
      browserType: 'chromium',
      headless: false,
      slowMo: 100
    },
    // MCP options
    mcpOptions: {
      visionMode: true
    },
    // Reporting options
    reportingOptions: {
      outputFormat: 'html',
      outputPath: './test-reports'
    }
  });

  try {
    // Use a local project
    await sdk.useLocalProject('./test-project');

    // Or clone from Git (uncomment to use)
    // await sdk.cloneRepository('https://github.com/example/test-project.git', {
    //   username: 'user',
    //   password: 'password'
    // });

    // Start the frontend project
    await sdk.startFrontendProject();

    // Launch the browser
    await sdk.launchBrowser();

    // Generate test cases from requirements
    const requirements = `
      1. User should be able to log in with valid credentials.
      2. User should see an error message with invalid credentials.
      3. User should be able to search for products on the home page.
      4. User should be able to add items to the shopping cart.
      5. User should be able to check out and complete an order.
    `;

    const testCases = await sdk.generateTestsFromRequirements(requirements);
    console.log(`Generated ${testCases.length} test cases.`);

    // Run the tests
    const testResults = await sdk.runTests(testCases);
    console.log(`Tests completed: ${testResults.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Passed: ${testResults.testCases.filter(tc => tc.passed).length}`);
    console.log(`Failed: ${testResults.testCases.filter(tc => !tc.passed).length}`);

    // Generate an error report
    const errorReport = await sdk.generateErrorReport();
    const reportPath = await sdk.saveErrorReport(errorReport);
    console.log(`Error report saved to: ${reportPath}`);

    // Generate a Playwright test script
    const scriptPath = await sdk.generateTestScript('./generated-tests/test-suite.ts');
    console.log(`Test script generated at: ${scriptPath}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up resources
    await sdk.close();
  }
}

// Run the example
main().catch(console.error);
