/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description: 字符串工具函数
 */

/**
 * 将驼峰命名转换为短横线命名
 * @param str 驼峰命名字符串
 * @returns 短横线命名字符串
 * @example
 * camelToKebab('helloWorld') // 'hello-world'
 * camelToKebab('HelloWorld') // 'hello-world'
 * camelToKebab('aBCDEf') // 'a-b-c-d-ef'
 */
export function camelToKebab(str: string): string {
  if (!str) return str;

  // 逐个处理每个字符
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // 如果是大写字母
    if (/[A-Z]/.test(char)) {
      // 不是第一个字符时，在大写字母前添加连字符
      if (i > 0) {
        result += '-';
      }
      // 添加小写字母
      result += char.toLowerCase();
    } else {
      // 直接添加字符
      result += char;
    }
  }

  return result;
}

/**
 * 将短横线命名转换为驼峰命名
 * @param str 短横线命名字符串
 * @returns 驼峰命名字符串
 * @example
 * kebabToCamel('hello-world') // 'helloWorld'
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * 将字符串首字母大写
 * @param str 输入字符串
 * @returns 首字母大写的字符串
 * @example
 * capitalize('hello') // 'Hello'
 */
export function capitalize(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串截断到指定长度，并添加省略号
 * @param str 输入字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串
 * @example
 * truncate('Hello World', 7) // 'Hello...'
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * 是否为空字符串（null、undefined、''、仅空格）
 * @param str 输入字符串
 * @returns 是否为空
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim() === '';
}

/**
 * 移除字符串中的HTML标签
 * @param str 包含HTML标签的字符串
 * @returns 移除HTML标签后的字符串
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>?/gm, '');
}

export default {
  camelToKebab,
  kebabToCamel,
  capitalize,
  truncate,
  isEmpty,
  stripHtml,
};
