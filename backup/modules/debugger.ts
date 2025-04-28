import { Page } from 'playwright';
import { NetworkRequest, ConsoleMessage } from '../types';

/**
 * Debug module for capturing network requests and console output
 */
export class DebuggerModule {
  private page: Page | null = null;
  private networkRequests: NetworkRequest[] = [];
  private consoleMessages: ConsoleMessage[] = [];
  private isCapturingNetwork = false;
  private isCapturingConsole = false;
  private cdpSession: any = null;

  /**
   * Set the page to monitor
   * @param page Playwright Page object
   */
  setPage(page: Page): void {
    this.page = page;
  }

  /**
   * Start capturing network requests
   */
  async startNetworkCapture(): Promise<void> {
    if (!this.page) {
      throw new Error('No page available. Call setPage() first.');
    }

    // Reset the requests array
    this.networkRequests = [];

    // Only initialize capture once
    if (this.isCapturingNetwork) {
      return;
    }

    this.isCapturingNetwork = true;

    try {
      // Set up CDP session for Chrome DevTools Protocol access
      // Note: This is specific to Chromium-based browsers
      this.cdpSession = await (this.page as any).context().newCDPSession(this.page);

      // Enable network events
      await this.cdpSession.send('Network.enable');

      // Listen for request events
      this.cdpSession.on('Network.requestWillBeSent', (params: any) => {
        this.networkRequests.push({
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          postData: params.request.postData,
          timestamp: Date.now(),
          requestId: params.requestId,
          type: params.type,
        });
      });

      // Listen for response events
      this.cdpSession.on('Network.responseReceived', (params: any) => {
        const request = this.networkRequests.find(r => r.requestId === params.requestId);
        if (request) {
          request.response = {
            status: params.response.status,
            statusText: params.response.statusText,
            headers: params.response.headers,
            mimeType: params.response.mimeType,
            timestamp: Date.now(),
          };
        }
      });

      // Listen for response body events (for API calls)
      this.cdpSession.on('Network.loadingFinished', async (params: any) => {
        // Only process API calls to avoid huge data
        const request = this.networkRequests.find(r => r.requestId === params.requestId);
        if (request &&
            request.url.includes('/api/') &&
            request.response &&
            (request.response.mimeType?.includes('json') || request.response.mimeType?.includes('javascript'))) {
          try {
            const { body } = await this.cdpSession.send('Network.getResponseBody', { requestId: params.requestId });
            if (request.response) {
              request.response.body = body;
            }
          } catch (error) {
            // Sometimes response bodies can't be retrieved, ignore these errors
          }
        }
      });
    } catch (error) {
      console.error('Error setting up network capture:', error);
      this.isCapturingNetwork = false;
      throw error;
    }
  }

  /**
   * Start capturing console messages
   */
  startConsoleCapture(): void {
    if (!this.page) {
      throw new Error('No page available. Call setPage() first.');
    }

    // Reset the messages array
    this.consoleMessages = [];

    // Only initialize capture once
    if (this.isCapturingConsole) {
      return;
    }

    this.isCapturingConsole = true;

    // Listen for console events
    this.page.on('console', message => {
      this.consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: {
          url: message.location().url || '',
          lineNumber: message.location().lineNumber || 0,
          columnNumber: message.location().columnNumber || 0,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Also capture JavaScript errors
    this.page.on('pageerror', error => {
      this.consoleMessages.push({
        type: 'error',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get captured network requests
   * @returns Array of captured network requests
   */
  getNetworkRequests(): NetworkRequest[] {
    return this.networkRequests;
  }

  /**
   * Get captured console messages
   * @returns Array of captured console messages
   */
  getConsoleMessages(): ConsoleMessage[] {
    return this.consoleMessages;
  }

  /**
   * Stop capturing network requests
   */
  async stopNetworkCapture(): Promise<void> {
    if (this.cdpSession && this.isCapturingNetwork) {
      try {
        await this.cdpSession.send('Network.disable');
        this.isCapturingNetwork = false;
      } catch (error) {
        console.error('Error stopping network capture:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopNetworkCapture();
    this.isCapturingConsole = false;
    this.cdpSession = null;
    // No need to explicitly stop console capture as it's tied to page lifecycle
  }
}
