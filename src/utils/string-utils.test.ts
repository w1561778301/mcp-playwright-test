/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: 字符串工具函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  camelToKebab,
  kebabToCamel,
  capitalize,
  truncate,
  isEmpty,
  stripHtml,
} from './string-utils';

describe('字符串工具函数', () => {
  describe('camelToKebab', () => {
    it('应该将驼峰命名转换为短横线命名', () => {
      expect(camelToKebab('helloWorld')).toBe('hello-world');
      expect(camelToKebab('HelloWorld')).toBe('hello-world');
      expect(camelToKebab('hello')).toBe('hello');
      expect(camelToKebab('hello123World')).toBe('hello123-world');
      expect(camelToKebab('aBCDEf')).toBe('a-b-c-d-ef');
    });

    it('应该处理空字符串', () => {
      expect(camelToKebab('')).toBe('');
    });
  });

  describe('kebabToCamel', () => {
    it('应该将短横线命名转换为驼峰命名', () => {
      expect(kebabToCamel('hello-world')).toBe('helloWorld');
      expect(kebabToCamel('hello')).toBe('hello');
      expect(kebabToCamel('hello-world-test')).toBe('helloWorldTest');
      expect(kebabToCamel('a-b-c-d')).toBe('aBCD');
    });

    it('应该处理空字符串', () => {
      expect(kebabToCamel('')).toBe('');
    });
  });

  describe('capitalize', () => {
    it('应该将字符串首字母大写', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('hello world')).toBe('Hello world');
      expect(capitalize('h')).toBe('H');
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('应该处理空字符串', () => {
      expect(capitalize('')).toBe('');
    });

    it('应该处理null或undefined', () => {
      expect(capitalize('' as any)).toBe('');
      expect(capitalize(null as any)).toBe(null);
      expect(capitalize(undefined as any)).toBe(undefined);
    });
  });

  describe('truncate', () => {
    it('应该将字符串截断到指定长度并添加省略号', () => {
      expect(truncate('Hello World', 7)).toBe('Hello W...');
      expect(truncate('Hello', 7)).toBe('Hello');
      expect(truncate('Hello World', 0)).toBe('...');
    });

    it('应该处理空字符串', () => {
      expect(truncate('', 5)).toBe('');
    });

    it('应该处理null或undefined', () => {
      expect(truncate(null as any, 5)).toBe(null);
      expect(truncate(undefined as any, 5)).toBe(undefined);
    });
  });

  describe('isEmpty', () => {
    it('应该检测空字符串', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('  ')).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('应该检测非空字符串', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty('  hello  ')).toBe(false);
    });
  });

  describe('stripHtml', () => {
    it('应该移除HTML标签', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
      expect(stripHtml('<div><p>Hello</p><p>World</p></div>')).toBe('HelloWorld');
      expect(stripHtml('<a href="#">Link</a>')).toBe('Link');
      expect(stripHtml('No HTML')).toBe('No HTML');
    });

    it('应该处理空字符串', () => {
      expect(stripHtml('')).toBe('');
    });

    it('应该处理自闭合标签', () => {
      expect(stripHtml('<img src="img.jpg" />')).toBe('');
      expect(stripHtml('Hello <br/> World')).toBe('Hello  World');
    });
  });
});
