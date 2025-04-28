/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: 测试全局设置
 */
import { beforeAll, afterAll, vi, expect } from 'vitest';
import { join } from 'path';

// 保存原始环境变量
const originalEnv = { ...process.env };

// 在所有测试开始前执行
beforeAll(() => {
  // 设置全局测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'true';
  process.env.TEST_STORAGE_DIR = join(__dirname, '../test-results');

  // 设置全局匹配器
  expect.extend({
    toBeWithinRange(received, floor, ceiling) {
      const pass = received >= floor && received <= ceiling;
      if (pass) {
        return {
          message: () =>
            `expected ${received} not to be within range ${floor} - ${ceiling}`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${received} to be within range ${floor} - ${ceiling}`,
          pass: false,
        };
      }
    },
  });
});

// 在所有测试结束后执行
afterAll(() => {
  // 恢复原始环境变量
  process.env = { ...originalEnv };

  // 清理所有模拟
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

// 禁用控制台输出(如果需要)
if (process.env.SILENT_TESTS === 'true') {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
}

// 添加全局类型
declare global {
  namespace Vi {
    interface Assertion {
      toBeWithinRange(floor: number, ceiling: number): Assertion;
    }
  }
}
