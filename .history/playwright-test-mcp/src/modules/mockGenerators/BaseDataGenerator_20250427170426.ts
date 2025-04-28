import { MockDataOptions, MockDataRule } from '../../types';

/**
 * 基础数据生成器接口
 */
export interface BaseDataGenerator {
  /**
   * 根据模式生成模拟数据
   * @param schema 数据模式
   * @param options 生成选项
   * @returns 生成的模拟数据
   */
  generate(schema: any, options?: MockDataOptions): any;

  /**
   * 配置数据生成规则
   * @param rules 生成规则数组
   */
  setRules(rules: MockDataRule[]): void;

  /**
   * 添加数据生成规则
   * @param rule 生成规则
   */
  addRule(rule: MockDataRule): void;

  /**
   * 设置自定义数据模板
   * @param templates 模板字典
   */
  setTemplates(templates: Record<string, any>): void;
}

/**
 * 抽象基础数据生成器实现
 */
export abstract class AbstractBaseDataGenerator implements BaseDataGenerator {
  // 数据生成规则列表
  protected rules: MockDataRule[] = [];

  // 自定义数据模板
  protected templates: Record<string, any> = {};

  // 默认生成选项
  protected defaultOptions: MockDataOptions = {
    useExamples: true,
    fakerLocale: 'zh_CN',
  };

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options?: MockDataOptions) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * 根据模式生成模拟数据
   * @param schema 数据模式
   * @param options 生成选项
   */
  abstract generate(schema: any, options?: MockDataOptions): any;

  /**
   * 配置数据生成规则
   * @param rules 生成规则数组
   */
  setRules(rules: MockDataRule[]): void {
    this.rules = [...rules];
  }

  /**
   * 添加数据生成规则
   * @param rule 生成规则
   */
  addRule(rule: MockDataRule): void {
    this.rules.push(rule);
  }

  /**
   * 设置自定义数据模板
   * @param templates 模板字典
   */
  setTemplates(templates: Record<string, any>): void {
    this.templates = { ...templates };
  }

  /**
   * 根据字段名称查找匹配的规则
   * @param fieldName 字段名称
   * @param schema 该字段的模式
   * @returns 生成的值，如果没有匹配的规则则返回undefined
   */
  protected findMatchingRule(fieldName: string, schema: any): any {
    for (const rule of this.rules) {
      const { fieldPattern, generator } = rule;

      if (typeof fieldPattern === 'string') {
        // 字符串精确匹配
        if (fieldName === fieldPattern) {
          return generator(fieldName, schema);
        }
      } else if (fieldPattern instanceof RegExp) {
        // 正则表达式匹配
        if (fieldPattern.test(fieldName)) {
          return generator(fieldName, schema);
        }
      }
    }

    return undefined;
  }

  /**
   * 查找自定义模板
   * @param templateName 模板名称
   * @returns 模板值，如果没有则返回undefined
   */
  protected findTemplate(templateName: string): any {
    return this.templates[templateName];
  }
}
