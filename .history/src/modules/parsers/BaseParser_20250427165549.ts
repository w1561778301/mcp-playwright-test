import { ParsedAPIDocument, APIDocParserOptions } from '../../types';

/**
 * 基础API文档解析器接口
 */
export interface BaseParser {
  /**
   * 解析API文档
   * @param docPath API文档路径，可以是文件路径或URL
   * @param options 解析选项
   * @returns 解析后的API文档结构
   */
  parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument>;

  /**
   * 解析API文档内容
   * @param content API文档内容
   * @param options 解析选项
   * @returns 解析后的API文档结构
   */
  parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument>;

  /**
   * 检查是否支持指定格式
   * @param format 文档格式
   * @returns 是否支持该格式
   */
  supports(format: string): boolean;
}

/**
 * 抽象基础解析器实现
 */
export abstract class AbstractBaseParser implements BaseParser {
  /**
   * 构造函数
   * @param supportedFormats 支持的文档格式列表
   */
  constructor(protected readonly supportedFormats: string[]) {}

  /**
   * 检查是否支持指定格式
   * @param format 文档格式
   * @returns 是否支持该格式
   */
  supports(format: string): boolean {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * 解析API文档
   * @param docPath API文档路径
   * @param options 解析选项
   */
  abstract parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument>;

  /**
   * 解析API文档内容
   * @param content API文档内容
   * @param options 解析选项
   */
  abstract parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument>;

  /**
   * 从解析后的文档生成测试用例
   * @param document 解析后的API文档
   * @returns 生成的API测试用例
   */
  protected generateTestCasesFromDocument(document: ParsedAPIDocument): ParsedAPIDocument {
    // 为每个端点生成测试用例
    document.endpoints.forEach(endpoint => {
      // 这里是基本的测试用例生成逻辑，可以在具体子类中进行扩展
      if (!endpoint.testCases) {
        endpoint.testCases = [];
      }

      // 添加基本的测试用例 - 验证状态码
      endpoint.testCases.push({
        id: `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[\/{}]/g, '-')}-status`,
        description: `Test status code for ${endpoint.method} ${endpoint.path}`,
        endpoint: endpoint.path,
        method: endpoint.method,
        assertions: [
          { type: 'status', target: 'status', operator: '=', value: 200 }
        ]
      });
    });

    return document;
  }
}
