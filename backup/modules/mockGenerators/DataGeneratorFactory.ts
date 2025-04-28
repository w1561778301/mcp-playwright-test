import { BaseDataGenerator } from './BaseDataGenerator';
import { SchemaBasedGenerator } from './SchemaBasedGenerator';
import { ExampleBasedGenerator } from './ExampleBasedGenerator';
import { MockDataOptions } from '../../types';

/**
 * 数据生成器类型
 */
export type GeneratorType = 'schema' | 'example';

/**
 * 数据生成器工厂类
 * 用于创建不同类型的数据生成器
 */
export class DataGeneratorFactory {
  private static instance: DataGeneratorFactory;
  private generators: Map<string, BaseDataGenerator> = new Map();

  /**
   * 私有构造函数，初始化生成器
   */
  private constructor() {
    // 初始化默认生成器
    this.generators.set('schema', new SchemaBasedGenerator());
    this.generators.set('example', new ExampleBasedGenerator());
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DataGeneratorFactory {
    if (!DataGeneratorFactory.instance) {
      DataGeneratorFactory.instance = new DataGeneratorFactory();
    }
    return DataGeneratorFactory.instance;
  }

  /**
   * 获取指定类型的数据生成器
   * @param type 生成器类型
   * @param options 配置选项
   * @returns 数据生成器实例
   */
  public getGenerator(type: GeneratorType = 'schema', options?: MockDataOptions): BaseDataGenerator {
    // 如果有配置选项，创建新实例
    if (options) {
      switch (type) {
        case 'schema':
          return new SchemaBasedGenerator(options);
        case 'example':
          return new ExampleBasedGenerator(options);
        default:
          return new SchemaBasedGenerator(options);
      }
    }

    // 如果没有选项，使用缓存的实例
    return this.generators.get(type) || this.generators.get('schema')!;
  }

  /**
   * 注册新的数据生成器
   * @param type 生成器类型
   * @param generator 数据生成器实例
   */
  public registerGenerator(type: string, generator: BaseDataGenerator): void {
    this.generators.set(type, generator);
  }
}
