/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: 配置工具测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, gitConfig, projectConfig, browserConfig, testConfig } from './config';

describe('配置工具', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 清空环境变量
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = { ...originalEnv };
  });

  describe('getConfig', () => {
    it('应当返回字符串类型的配置值', () => {
      process.env.TEST_STRING = 'test-value';
      expect(getConfig('TEST_STRING', 'default')).toBe('test-value');
    });

    it('应当返回数字类型的配置值', () => {
      process.env.TEST_NUMBER = '123';
      expect(getConfig('TEST_NUMBER', 0)).toBe(123);
    });

    it('应当返回布尔类型的配置值', () => {
      process.env.TEST_BOOL_TRUE = 'true';
      process.env.TEST_BOOL_FALSE = 'false';
      expect(getConfig('TEST_BOOL_TRUE', false)).toBe(true);
      expect(getConfig('TEST_BOOL_FALSE', true)).toBe(false);
    });

    it('应当解析JSON对象配置值', () => {
      process.env.TEST_OBJECT = '{"key":"value"}';
      expect(getConfig('TEST_OBJECT', {})).toEqual({ key: 'value' });
    });

    it('当解析失败时，应当返回默认对象值', () => {
      process.env.TEST_INVALID_OBJECT = 'not-json';
      const defaultObj = { default: true };
      expect(getConfig('TEST_INVALID_OBJECT', defaultObj)).toBe(defaultObj);
    });

    it('当环境变量不存在时，应当返回默认值', () => {
      expect(getConfig('NON_EXISTENT', 'default')).toBe('default');
    });
  });

  describe('gitConfig', () => {
    it('应当返回git配置的默认值', () => {
      expect(gitConfig.path).toBe('git');
      expect(gitConfig.branch).toBeUndefined();
      expect(gitConfig.depth).toBeUndefined();
      expect(gitConfig.username).toBeUndefined();
      expect(gitConfig.password).toBeUndefined();
    });

    it('应当返回从环境变量中获取的git配置值', () => {
      process.env.SIMPLE_GIT_PATH = '/usr/bin/git';
      process.env.SIMPLE_GIT_BRANCH = 'main';
      process.env.SIMPLE_GIT_DEPTH = '1';
      process.env.SIMPLE_GIT_USERNAME = 'test-user';
      process.env.SIMPLE_GIT_PASSWORD = 'test-pass';

      expect(gitConfig.path).toBe('/usr/bin/git');
      expect(gitConfig.branch).toBe('main');
      expect(gitConfig.depth).toBe(1);
      expect(gitConfig.username).toBe('test-user');
      expect(gitConfig.password).toBe('test-pass');
    });
  });

  describe('projectConfig', () => {
    it('应当返回项目配置的默认值', () => {
      expect(projectConfig.codePath).toBe('.');
      expect(projectConfig.apiDocPath).toBe('./docs/api.yaml');
      expect(projectConfig.apiBaseUrl).toBe('http://localhost:3000');
      expect(projectConfig.apiKey).toBeUndefined();
    });

    it('应当返回从环境变量中获取的项目配置值', () => {
      process.env.CODE_PATH = '/path/to/code';
      process.env.API_DOC_PATH = '/path/to/api.yaml';
      process.env.API_URL = 'https://api.example.com';
      process.env.API_KEY = 'test-api-key';

      expect(projectConfig.codePath).toBe('/path/to/code');
      expect(projectConfig.apiDocPath).toBe('/path/to/api.yaml');
      expect(projectConfig.apiBaseUrl).toBe('https://api.example.com');
      expect(projectConfig.apiKey).toBe('test-api-key');
    });
  });

  describe('browserConfig', () => {
    it('应当返回浏览器配置的默认值', () => {
      expect(browserConfig.type).toBe('chromium');
      expect(browserConfig.headless).toBe(true);
      expect(browserConfig.viewportWidth).toBe(1280);
      expect(browserConfig.viewportHeight).toBe(720);
      expect(browserConfig.slowMo).toBe(0);
    });

    it('应当返回从环境变量中获取的浏览器配置值', () => {
      process.env.BROWSER_TYPE = 'firefox';
      process.env.BROWSER_HEADLESS = 'false';
      process.env.BROWSER_VIEWPORT_WIDTH = '1920';
      process.env.BROWSER_VIEWPORT_HEIGHT = '1080';
      process.env.BROWSER_SLOW_MO = '50';

      expect(browserConfig.type).toBe('firefox');
      expect(browserConfig.headless).toBe(false);
      expect(browserConfig.viewportWidth).toBe(1920);
      expect(browserConfig.viewportHeight).toBe(1080);
      expect(browserConfig.slowMo).toBe(50);
    });
  });

  describe('testConfig', () => {
    it('应当返回测试配置的默认值', () => {
      expect(testConfig.storageDir).toBe('./test-results');
      expect(testConfig.timeout).toBe(30000);
      expect(testConfig.retries).toBe(1);
    });

    it('应当返回从环境变量中获取的测试配置值', () => {
      process.env.TEST_STORAGE_DIR = '/path/to/results';
      process.env.TEST_TIMEOUT = '60000';
      process.env.TEST_RETRIES = '3';

      expect(testConfig.storageDir).toBe('/path/to/results');
      expect(testConfig.timeout).toBe(60000);
      expect(testConfig.retries).toBe(3);
    });
  });
});
