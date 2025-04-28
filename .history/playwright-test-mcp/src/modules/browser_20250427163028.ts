import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { BrowserOptions, MCPOptions } from '../types';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';

// Import check for the MCP server package
let createMCPServer: any;
try {
  // Dynamically try to import @playwright/mcp
  // If not available, this will be handled gracefully
  const mcpModule = require('@playwright/mcp');
  createMCPServer = mcpModule.createServer;
} catch (e) {
  console.warn('Warning: @playwright/mcp not found. MCP functionality will be limited.');
}

/**
 * Browser module for controlling Playwright and MCP
 */
export class BrowserModule {
  private options: BrowserOptions = {};
  private mcpOptions: MCPOptions = {};
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private mcpServer: any = null;
  private frontendProcess: ChildProcess | null = null;
  private projectPath: string | null = null;

  constructor(browserOptions: BrowserOptions = {}, mcpOptions: MCPOptions = {}) {
    this.options = browserOptions;
    this.mcpOptions = mcpOptions;
  }

  /**
   * Set project path for frontend operations
   * @param projectPath Path to frontend project
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
  }

  /**
   * Launch a browser instance
   * @param options Browser options to override defaults
   */
  async launchBrowser(options?: BrowserOptions): Promise<void> {
    const mergedOptions = { ...this.options, ...options };

    // Launch browser based on type
    switch (mergedOptions.browserType || 'chromium') {
      case 'firefox':
        this.browser = await firefox.launch({
          headless: mergedOptions.headless,
          slowMo: mergedOptions.slowMo,
        });
        break;
      case 'webkit':
        this.browser = await webkit.launch({
          headless: mergedOptions.headless,
          slowMo: mergedOptions.slowMo,
        });
        break;
      default:
        this.browser = await chromium.launch({
          headless: mergedOptions.headless,
          slowMo: mergedOptions.slowMo,
        });
    }

    // Create browser context
    this.context = await this.browser.newContext({
      viewport: mergedOptions.viewport,
      userAgent: mergedOptions.userAgent,
    });

    // Create page
    this.page = await this.context.newPage();
  }

  /**
   * Set up MCP server for browser control
   */
  async setupMCPServer(): Promise<void> {
    if (!createMCPServer) {
      throw new Error('@playwright/mcp package is required. Please install it first.');
    }

    // Create and configure the MCP server
    this.mcpServer = createMCPServer({
      launchOptions: {
        headless: this.options.headless || false,
        slowMo: this.options.slowMo,
        args: this.mcpOptions.visionMode ? ['--vision'] : []
      }
    });

    // Set up transport if needed
    if (this.mcpOptions.transport) {
      const port = this.mcpOptions.port || 8931;

      const server = http.createServer();
      server.listen(port);

      console.log(`MCP server listening on port ${port}`);

      // Connect the MCP server to appropriate transport
      switch (this.mcpOptions.transport) {
        case 'http':
          // Implementation for HTTP transport
          break;
        case 'sse':
          // Implementation for Server-Sent Events transport
          // Example: const transport = new SSEServerTransport("/messages", response);
          // this.mcpServer.connect(transport);
          break;
        case 'ws':
          // Implementation for WebSocket transport
          break;
        default:
          console.warn(`Unsupported transport: ${this.mcpOptions.transport}`);
      }
    }
  }

  /**
   * Start frontend project
   */
  async startFrontendProject(): Promise<void> {
    if (!this.projectPath) {
      throw new Error('No project path set. Call setProjectPath() first');
    }

    // Detect project type and start appropriate command
    const hasPackageJson = fs.existsSync(path.join(this.projectPath, 'package.json'));

    if (hasPackageJson) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectPath, 'package.json'), 'utf-8'));

      // Determine start command from package.json
      let startCommand = 'npm start';

      if (packageJson.scripts) {
        if (packageJson.scripts.dev) {
          startCommand = 'npm run dev';
        } else if (packageJson.scripts.serve) {
          startCommand = 'npm run serve';
        }
      }

      // First install dependencies
      console.log('Installing dependencies...');
      await new Promise<void>((resolve, reject) => {
        exec('npm install', { cwd: this.projectPath }, (error) => {
          if (error) {
            console.warn('Error installing dependencies:', error);
            // Continue anyway, might be using existing deps
          }
          resolve();
        });
      });

      // Execute the start command
      console.log(`Starting frontend project with: ${startCommand}`);
      const [cmd, ...args] = startCommand.split(' ');
      this.frontendProcess = spawn(cmd, args, {
        cwd: this.projectPath,
        shell: true,
        stdio: 'pipe'
      });

      // Log output
      this.frontendProcess.stdout?.on('data', (data) => {
        console.log(`Frontend stdout: ${data}`);
      });

      this.frontendProcess.stderr?.on('data', (data) => {
        console.error(`Frontend stderr: ${data}`);
      });

      // Wait for the server to start
      // In practice, you'd want a more robust solution to detect when the server is ready
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('Frontend project started');
    } else {
      throw new Error('Unsupported project type. No package.json found.');
    }
  }

  /**
   * Get the current page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the current browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get the current browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Clean up all resources
   */
  async close(): Promise<void> {
    // Stop frontend process if running
    if (this.frontendProcess) {
      this.frontendProcess.kill();
      this.frontendProcess = null;
    }

    // Close MCP server if running
    if (this.mcpServer) {
      // Assuming mcpServer has a close method
      await this.mcpServer.close?.();
      this.mcpServer = null;
    }

    // Close browser if open
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
