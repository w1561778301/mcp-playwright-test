import { AbstractBaseDataGenerator } from "./BaseDataGenerator";
import { MockDataOptions } from "../../types";
import { faker } from "@faker-js/faker";

/**
 * 基于模式的数据生成器
 * 根据JSON Schema生成模拟数据
 */
export class SchemaBasedGenerator extends AbstractBaseDataGenerator {
  constructor(options?: MockDataOptions) {
    super(options);

    // 设置faker本地化
    if (options?.fakerLocale) {
      faker.setLocale(options.fakerLocale);
    }
  }

  /**
   * 根据模式生成模拟数据
   * @param schema 数据模式
   * @param options 生成选项
   * @returns 生成的模拟数据
   */
  generate(schema: any, options?: MockDataOptions): any {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 如果schema是undefined或null，返回null
    if (schema === undefined || schema === null) {
      return null;
    }

    // 如果有example且启用了使用示例，优先使用
    if (mergedOptions.useExamples && schema.example !== undefined) {
      return schema.example;
    }

    // 根据模式类型生成数据
    const schemaType = this.determineType(schema);

    switch (schemaType) {
      case "object":
        return this.generateObject(schema, mergedOptions);
      case "array":
        return this.generateArray(schema, mergedOptions);
      case "string":
        return this.generateString(schema);
      case "number":
      case "integer":
        return this.generateNumber(schema, schemaType === "integer");
      case "boolean":
        return this.generateBoolean();
      case "null":
        return null;
      default:
        return null;
    }
  }

  /**
   * 确定模式的类型
   * @param schema 数据模式
   * @returns 确定的类型
   */
  private determineType(schema: any): string {
    // 如果直接指定了类型，使用指定的类型
    if (schema.type) {
      return schema.type;
    }

    // 从模式的其他属性推断类型
    if (schema.properties || schema.additionalProperties) {
      return "object";
    }

    if (schema.items) {
      return "array";
    }

    // 默认为对象类型
    return "object";
  }

  /**
   * 生成对象类型的模拟数据
   * @param schema 对象模式
   * @param options 生成选项
   * @returns 生成的对象
   */
  private generateObject(schema: any, options: MockDataOptions): any {
    const result: any = {};

    // 处理所有属性
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries<any>(schema.properties)) {
        // 检查是否有自定义规则
        const customValue = this.findMatchingRule(propName, propSchema);

        if (customValue !== undefined) {
          result[propName] = customValue;
        } else {
          // 否则根据属性模式生成
          result[propName] = this.generate(propSchema, options);
        }
      }
    }

    return result;
  }

  /**
   * 生成数组类型的模拟数据
   * @param schema 数组模式
   * @param options 生成选项
   * @returns 生成的数组
   */
  private generateArray(schema: any, options: MockDataOptions): any[] {
    // 确定数组长度
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 5;
    const count = faker.number.int({ min: minItems, max: maxItems });

    const result: any[] = [];

    // 生成数组元素
    if (schema.items) {
      for (let i = 0; i < count; i++) {
        result.push(this.generate(schema.items, options));
      }
    }

    return result;
  }

  /**
   * 生成字符串类型的模拟数据
   * @param schema 字符串模式
   * @returns 生成的字符串
   */
  private generateString(schema: any): string {
    // 处理特定格式
    if (schema.format) {
      switch (schema.format) {
        case "email":
          return faker.internet.email();
        case "uri":
        case "url":
          return faker.internet.url();
        case "uuid":
          return faker.string.uuid();
        case "date":
          return faker.date.recent().toISOString().split("T")[0];
        case "date-time":
          return faker.date.recent().toISOString();
        case "ipv4":
          return faker.internet.ipv4();
        case "ipv6":
          return faker.internet.ipv6();
        case "hostname":
          return faker.internet.domainName();
        case "phone":
        case "telephone":
          return faker.phone.number();
        default:
          break;
      }
    }

    // 处理符合某些常见名称的字段
    const fieldName = schema.title || schema.name || "";
    const lowerFieldName = fieldName.toLowerCase();

    if (lowerFieldName.includes("name")) {
      return faker.person.fullName();
    } else if (lowerFieldName.includes("email")) {
      return faker.internet.email();
    } else if (lowerFieldName.includes("phone") || lowerFieldName.includes("tel")) {
      return faker.phone.number();
    } else if (lowerFieldName.includes("address")) {
      return faker.location.streetAddress();
    } else if (lowerFieldName.includes("city")) {
      return faker.location.city();
    } else if (lowerFieldName.includes("country")) {
      return faker.location.country();
    } else if (lowerFieldName.includes("zip") || lowerFieldName.includes("postal")) {
      return faker.location.zipCode();
    } else if (lowerFieldName.includes("description") || lowerFieldName.includes("desc")) {
      return faker.lorem.paragraph();
    } else if (lowerFieldName.includes("title")) {
      return faker.lorem.sentence();
    } else if (lowerFieldName.includes("comment")) {
      return faker.lorem.paragraph(1);
    } else if (lowerFieldName.includes("username")) {
      return faker.internet.userName();
    } else if (lowerFieldName.includes("password")) {
      return faker.internet.password();
    } else if (lowerFieldName.includes("url") || lowerFieldName.includes("uri")) {
      return faker.internet.url();
    } else if (lowerFieldName.includes("id") || lowerFieldName.includes("uuid")) {
      return faker.string.uuid();
    }

    // 默认生成一个随机短句
    return faker.lorem.sentence();
  }

  /**
   * 生成数字类型的模拟数据
   * @param schema 数字模式
   * @param isInteger 是否为整数
   * @returns 生成的数字
   */
  private generateNumber(schema: any, isInteger: boolean = false): number {
    // 确定范围
    const minimum = schema.minimum !== undefined ? schema.minimum : -1000;
    const maximum = schema.maximum !== undefined ? schema.maximum : 1000;

    if (isInteger) {
      return faker.number.int({ min: minimum, max: maximum });
    } else {
      return faker.number.float({ min: minimum, max: maximum, precision: 0.01 });
    }
  }

  /**
   * 生成布尔类型的模拟数据
   * @returns 随机布尔值
   */
  private generateBoolean(): boolean {
    return faker.datatype.boolean();
  }
}
