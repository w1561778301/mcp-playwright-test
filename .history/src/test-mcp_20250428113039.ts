import { createMCPServer } from './mcp/server';

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    // Create and start the MCP server
    const server = createMCPServer({
      port: 8931, // Default MCP port
      transport: 'http', // Use HTTP transport
    });

    console.log('MCP Playwright Test Server started on port 8931');
    console.log('Available resources:');
    console.log('- reports: Fetch test execution reports');
    console.log('- api-specs: Retrieve API specifications');
    console.log('- test-cases: Retrieve test cases');
    console.log('');
    console.log('Available tools:');
    console.log('- clone-repository: Clone a Git repository');
    console.log('- use-local-project: Use a local project');
    console.log('- launch-browser: Launch a browser for testing');
    console.log('- generate-tests-from-text: Generate tests from text requirements');
    console.log('- generate-tests-from-document: Generate tests from a document');
    console.log('- run-tests: Run tests from a test suite');
    console.log('- api-test: Generate and run API tests');
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
