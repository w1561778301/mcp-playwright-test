import { AbstractBaseDataGenerator } from './BaseDataGenerator';
import { MockDataOptions } from '../../types';
import { SchemaBasedGenerator } from './SchemaBasedGenerator';
import { faker } from '@faker-js/faker';

/**
 * 基于示例的数据生成器
 * 根据示例数据生成相似但不完全相同的数据
 */
export class ExampleBasedGenerator extends AbstractBaseDataGenerator {
  private schemaGenerator: SchemaBasedGenerator;

  constructor(options?: MockDataOptions) {
    super(options);
    this.schemaGenerator = new SchemaBasedGenerator(options);
  }

  /**
   * 根据示例生成模拟数据
   * @param example 示例数据
   * @param options 生成选项
   * @returns 生成的模拟数据
   */
  generate(example: any, options?: MockDataOptions): any {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 如果示例是undefined或null，返回null
    if (example === undefined || example === null) {
      return null;
    }

    // 根据示例类型生成数据
    if (Array.isArray(example)) {
      return this.generateArray(example, mergedOptions);
    } else if (typeof example === 'object') {
      return this.generateObject(example, mergedOptions);
    } else if (typeof example === 'string') {
      return this.generateString(example);
    } else if (typeof example === 'number') {
      return this.generateNumber(example);
    } else if (typeof example === 'boolean') {
      return this.generateBoolean(example);
    } else {
      return example;
    }
  }

  /**
   * 从示例对象生成模拟对象
   * @param example 示例对象
   * @param options 生成选项
   * @returns 生成的对象
   */
  private generateObject(example: Record<string, any>, options: MockDataOptions): Record<string, any> {
    const result: Record<string, any> = {};

    // 处理所有属性
    for (const [key, value] of Object.entries(example)) {
      // 检查是否有自定义规则
      const customValue = this.findMatchingRule(key, { example: value });

      if (customValue !== undefined) {
        result[key] = customValue;
      } else {
        // 否则根据示例值生成
        result[key] = this.generate(value, options);
      }
    }

    return result;
  }

  /**
   * 从示例数组生成模拟数组
   * @param example 示例数组
   * @param options 生成选项
   * @returns 生成的数组
   */
  private generateArray(example: any[], options: MockDataOptions): any[] {
    // 根据示例数组长度确定生成的数组长度
    const minLength = Math.max(1, example.length - 2);
    const maxLength = example.length + 2;
    const length = faker.number.int({ min: minLength, max: maxLength });

    const result: any[] = [];

    // 生成数组元素
    for (let i = 0; i < length; i++) {
      // 循环使用示例数组中的元素作为模板
      const templateIndex = i % example.length;
      result.push(this.generate(example[templateIndex], options));
    }

    return result;
  }

  /**
   * 从示例字符串生成模拟字符串
   * @param example 示例字符串
   * @returns 生成的字符串
   */
  private generateString(example: string): string {
    // 尝试根据示例字符串的特征生成类似的数据

    // 检查是否为电子邮件
    if (example.includes('@') && example.includes('.')) {
      return faker.internet.email();
    }

    // 检查是否为URL
    if (example.startsWith('http') || example.includes('www.')) {
      return faker.internet.url();
    }

    // 检查是否为日期
    if (/^\d{4}-\d{2}-\d{2}/.test(example)) {
      return faker.date.recent().toISOString().split('T')[0];
    }

    // 检查是否为日期时间
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(example)) {
      return faker.date.recent().toISOString();
    }

    // 检查是否为UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(example)) {
      return faker.string.uuid();
    }

    // 检查是否为JSON
    if (example.startsWith('{') && example.endsWith('}') || example.startsWith('[') && example.endsWith(']')) {
      try {
        const parsed = JSON.parse(example);
        const generated = this.generate(parsed);
        return JSON.stringify(generated);
      } catch (e) {
        // 解析失败，不是有效的JSON
      }
    }

    // 根据字符串长度生成类似长度的文本
    if (example.length < 10) {
      return faker.lorem.word();
    } else if (example.length < 50) {
      return faker.lorem.sentence();
    } else if (example.length < 200) {
      return faker.lorem.paragraph();
    } else {
      return faker.lorem.paragraphs(2);
    }
  }

  /**
   * 从示例数字生成模拟数字
   * @param example 示例数字
   * @returns 生成的数字
   */
  private generateNumber(example: number): number {
    // 生成与示例数字相似的数字
    const isInteger = Number.isInteger(example);
    const min = example * 0.8;
    const max = example * 1.2;

    if (isInteger) {
      return faker.number.int({ min: Math.floor(min), max: Math.ceil(max) });
    } else {
      return faker.number.float({ min, max, precision: 0.01 });
    }
  }

  /**
   * 从示例布尔值生成模拟布尔值
   * @param example 示例布尔值
   * @returns 生成的布尔值
   */
  private generateBoolean(example: boolean): boolean {
    // 70%的概率返回与示例相同的值，30%的概率返回相反的值
    return faker.datatype.boolean({ probability: example ? 0.7 : 0.3 });
  }
}
