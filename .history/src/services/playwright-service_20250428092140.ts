import { chromium, firefox, webkit, Browser, BrowserContext, Page, ConsoleMessage, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserOptions {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  slowMo?: number;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  postData?: string;
  timestamp: number;
  requestId?: string;
  type?: string;
  response?: NetworkResponse;
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  mimeType?: string;
  timestamp?: number;
  body?: string;
}

export interface ConsoleMessageData {
  type: string;
  text: string;
  location?: { url: string; lineNumber: number; columnNumber: number };
  timestamp: string;
  stack?: string;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consoleLogs: ConsoleMessageData[] = [];
  private networkRequests: NetworkRequest[] = [];

  constructor() {}

  /**
   * 启动浏览器
   * @param options 浏览器选项
   */
  async launchBrowser(options: BrowserOptions = {}): Promise<void> {
    // 关闭已存在的浏览器实例
    await this.closeBrowser();

    try {
      // 设置默认选项
      const browserType = options.browserType || 'chromium';
      const headless = options.headless !== undefined ? options.headless : false;
      const slowMo = options.slowMo || 0;

      // 选择浏览器类型
      switch (browserType) {
        case 'firefox':
          this.browser = await firefox.launch({
            headless,
            slowMo,
          });
          break;
        case 'webkit':
          this.browser = await webkit.launch({
            headless,
            slowMo,
          });
          break;
        default:
          this.browser = await chromium.launch({
            headless,
            slowMo,
          });
      }

      // 创建浏览器上下文
      this.context = await this.browser.newContext({
        viewport: options.viewport,
        userAgent: options.userAgent,
      });

      // 创建页面
      this.page = await this.context.newPage();

      // 监听控制台消息
      this.page.on('console', this.handleConsoleMessage.bind(this));

      // 监听网络请求
      this.page.on('request', this.handleNetworkRequest.bind(this));
      this.page.on('response', this.handleNetworkResponse.bind(this));

      console.log(`Browser (${browserType}) launched successfully`);
    } catch (error) {
      console.error('Error launching browser:', error);
      throw new Error(`Failed to launch browser: ${(error as Error).message}`);
    }
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        console.log('Browser closed successfully');
      }
    } catch (error) {
      console.error('Error closing browser:', error);
      throw new Error(`Failed to close browser: ${(error as Error).message}`);
    }
  }

  /**
   * 获取控制台日志
   * @returns 控制台消息数组
   */
  async getConsoleLogs(): Promise<ConsoleMessageData[]> {
    return this.consoleLogs;
  }

  /**
   * 获取网络请求
   * @returns 网络请求数组
   */
  async getNetworkRequests(): Promise<NetworkRequest[]> {
    return this.networkRequests;
  }

  /**
   * 清除控制台日志
   */
  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  /**
   * 清除网络请求
   */
  clearNetworkRequests(): void {
    this.networkRequests = [];
  }

  /**
   * 获取Page对象
   * @returns Page对象或null
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * 获取Context对象
   * @returns BrowserContext对象或null
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * 获取Browser对象
   * @returns Browser对象或null
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * 捕获页面截图
   * @param outputPath 输出路径
   * @returns 截图路径
   */
  async captureScreenshot(outputPath?: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser page not initialized. Call launchBrowser() first.');
    }

    try {
      // 如果没有指定输出路径，使用时间戳创建一个
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = path.join(process.cwd(), 'screenshots', `screenshot-${timestamp}.png`);
      }

      // 确保目录存在
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 捕获截图
      await this.page.screenshot({ path: outputPath });
      console.log(`Screenshot saved to ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw new Error(`Failed to capture screenshot: ${(error as Error).message}`);
    }
  }

  /**
   * 处理控制台消息
   * @param message 控制台消息
   */
  private handleConsoleMessage(message: ConsoleMessage): void {
    const location = message.location();

    const consoleMessage: ConsoleMessageData = {
      type: message.type(),
      text: message.text(),
      location: {
        url: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      },
      timestamp: new Date().toISOString(),
      stack: message.stackTrace()?.length > 0 ? JSON.stringify(message.stackTrace()) : undefined,
    };

    this.consoleLogs.push(consoleMessage);

    // 打印到控制台
    console.log(`[Browser Console] [${consoleMessage.type}]: ${consoleMessage.text}`);
  }

  /**
   * 处理网络请求
   * @param request 请求对象
   */
  private handleNetworkRequest(request: Request): void {
    const networkRequest: NetworkRequest = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData() || undefined,
      timestamp: Date.now(),
      requestId: request.requestId || undefined,
      type: request.resourceType(),
    };

    this.networkRequests.push(networkRequest);

    // 打印到控制台
    console.log(`[Network Request] ${networkRequest.method} ${networkRequest.url}`);
  }

  /**
   * 处理网络响应
   * @param response 响应对象
   */
  private async handleNetworkResponse(response: Response): Promise<void> {
    const request = response.request();
    const requestId = request.requestId;

    // 寻找对应的请求
    const networkRequest = this.networkRequests.find(req => req.requestId === requestId);

    if (networkRequest) {
      // 添加响应信息
      networkRequest.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        mimeType: response.headers()['content-type'],
        timestamp: Date.now(),
      };

      // 尝试获取响应体（只获取文本和JSON等文本类型的响应）
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json') ||
            contentType.includes('text') ||
            contentType.includes('javascript') ||
            contentType.includes('xml')) {
          networkRequest.response.body = await response.text();
        }
      } catch (error) {
        console.warn(`Could not get response body for ${response.url()}: ${(error as Error).message}`);
      }

      // 打印到控制台
      console.log(`[Network Response] ${networkRequest.method} ${networkRequest.url} - ${response.status()} ${response.statusText()}`);
    }
  }
}
