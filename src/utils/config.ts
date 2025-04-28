/**
 * @file 配置工具
 * @description 从环境变量加载配置参数
 */

/**
 * 获取配置值
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 配置值
 */
export function getConfig<T>(key: string, defaultValue: T): T {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  // 处理布尔值
  if (defaultValue === true || defaultValue === false) {
    return (value.toLowerCase() === 'true') as unknown as T;
  }

  // 处理数字
  if (typeof defaultValue === 'number') {
    return Number(value) as unknown as T;
  }

  // 处理对象或数组
  if (typeof defaultValue === 'object') {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn(`无法解析配置值 ${key} 为对象: ${e}`);
      return defaultValue;
    }
  }

  // 默认处理为字符串
  return value as unknown as T;
}

/**
 * Git相关配置
 */
export const gitConfig = {
  /**
   * Git路径
   */
  get path(): string {
    return getConfig('SIMPLE_GIT_PATH', 'git');
  },

  /**
   * 默认分支
   */
  get branch(): string | undefined {
    return getConfig('SIMPLE_GIT_BRANCH', undefined);
  },

  /**
   * 克隆深度
   */
  get depth(): number | undefined {
    const depth = getConfig('SIMPLE_GIT_DEPTH', undefined);
    return depth !== undefined ? Number(depth) : undefined;
  },

  /**
   * Git用户名
   */
  get username(): string | undefined {
    return getConfig('SIMPLE_GIT_USERNAME', undefined);
  },

  /**
   * Git密码或令牌
   */
  get password(): string | undefined {
    return getConfig('SIMPLE_GIT_PASSWORD', undefined);
  },
};

/**
 * 项目相关配置
 */
export const projectConfig = {
  /**
   * 代码路径
   */
  get codePath(): string {
    return getConfig('CODE_PATH', '.');
  },

  /**
   * API文档路径
   */
  get apiDocPath(): string {
    return getConfig('API_DOC_PATH', './docs/api.yaml');
  },

  /**
   * API基础URL
   */
  get apiBaseUrl(): string {
    return getConfig('API_URL', 'http://localhost:3000');
  },

  /**
   * API密钥
   */
  get apiKey(): string | undefined {
    return getConfig('API_KEY', undefined);
  },
};

/**
 * 浏览器相关配置
 */
export const browserConfig = {
  /**
   * 浏览器类型
   */
  get type(): 'chromium' | 'firefox' | 'webkit' {
    return getConfig('BROWSER_TYPE', 'chromium') as 'chromium' | 'firefox' | 'webkit';
  },

  /**
   * 是否使用无头模式
   */
  get headless(): boolean {
    return getConfig('BROWSER_HEADLESS', true);
  },

  /**
   * 视口宽度
   */
  get viewportWidth(): number {
    return getConfig('BROWSER_VIEWPORT_WIDTH', 1280);
  },

  /**
   * 视口高度
   */
  get viewportHeight(): number {
    return getConfig('BROWSER_VIEWPORT_HEIGHT', 720);
  },

  /**
   * 操作减速毫秒数
   */
  get slowMo(): number {
    return getConfig('BROWSER_SLOW_MO', 0);
  },
};

/**
 * 测试相关配置
 */
export const testConfig = {
  /**
   * 测试套件存储目录
   */
  get storageDir(): string {
    return getConfig('TEST_STORAGE_DIR', './test-results');
  },

  /**
   * 测试超时（毫秒）
   */
  get timeout(): number {
    return getConfig('TEST_TIMEOUT', 30000);
  },

  /**
   * 重试次数
   */
  get retries(): number {
    return getConfig('TEST_RETRIES', 1);
  },
};

export default {
  git: gitConfig,
  project: projectConfig,
  browser: browserConfig,
  test: testConfig,
};
