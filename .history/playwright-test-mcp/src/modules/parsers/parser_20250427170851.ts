import { APIRequest, APIResponse } from '../../types';

/**
 * 表示文档格式类型
 */
export enum DocumentFormat {
  OPENAPI_V2 = 'openapi_v2',
  OPENAPI_V3 = 'openapi_v3',
  POSTMAN = 'postman',
  INSOMNIA = 'insomnia',
  CUSTOM = 'custom'
}

/**
 * 解析后的API端点信息
 */
export interface APIEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  requestSchema?: any;
  responseSchemas?: {
    [statusCode: string]: any;
  };
  requestExamples?: any[];
  responseExamples?: {
    [statusCode: string]: any[];
  };
  parameters?: any[];
  headers?: Record<string, string>;
}

/**
 * 解析后的API文档
 */
export interface ParsedAPIDocument {
  title?: string;
  version?: string;
  description?: string;
  baseUrl?: string;
  endpoints: APIEndpoint[];
  schemas?: Record<string, any>;
}

/**
 * API文档解析器接口
 */
export interface APIDocumentParser {
  /**
   * 解析API文档
   * @param document API文档内容
   * @returns 解析后的API文档
   */
  parse(document: string): ParsedAPIDocument;

  /**
   * 获取支持的文档格式
   */
  getSupportedFormat(): DocumentFormat;

  /**
   * 从解析后的文档生成API测试用例
   * @param parsedDocument 解析后的API文档
   * @returns API请求和预期响应的测试用例列表
   */
  generateTestCases(parsedDocument: ParsedAPIDocument): Array<{
    request: APIRequest;
    expectedResponse: Partial<APIResponse>;
  }>;

  /**
   * 获取指定端点的请求模式
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 请求模式
   */
  getRequestSchema(parsedDocument: ParsedAPIDocument, path: string, method: string): any;

  /**
   * 获取指定端点的响应模式
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 响应模式，按状态码索引
   */
  getResponseSchemas(parsedDocument: ParsedAPIDocument, path: string, method: string): Record<string, any>;

  /**
   * 获取指定端点的请求示例
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 请求示例列表
   */
  getRequestExamples(parsedDocument: ParsedAPIDocument, path: string, method: string): any[];

  /**
   * 获取指定端点的响应示例
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 响应示例，按状态码索引
   */
  getResponseExamples(parsedDocument: ParsedAPIDocument, path: string, method: string): Record<string, any[]>;
}

/**
 * API文档解析器工厂类
 */
export class ParserFactory {
  private parsers: Map<DocumentFormat, APIDocumentParser> = new Map();

  /**
   * 注册解析器
   * @param parser API文档解析器
   */
  registerParser(parser: APIDocumentParser): void {
    this.parsers.set(parser.getSupportedFormat(), parser);
  }

  /**
   * 获取支持的所有解析器
   * @returns 解析器列表
   */
  getAvailableParsers(): APIDocumentParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * 获取指定格式的解析器
   * @param format 文档格式
   * @returns API文档解析器
   */
  getParser(format: DocumentFormat): APIDocumentParser | undefined {
    return this.parsers.get(format);
  }

  /**
   * 自动检测文档格式并返回适合的解析器
   * @param document API文档内容
   * @returns 最合适的API文档解析器
   * @throws 如果无法确定文档格式，抛出错误
   */
  detectParserForDocument(document: string): APIDocumentParser {
    try {
      // 尝试将文档解析为JSON
      const parsedDoc = JSON.parse(document);

      // 检测OpenAPI/Swagger文档
      if (parsedDoc.swagger === '2.0') {
        const parser = this.parsers.get(DocumentFormat.OPENAPI_V2);
        if (parser) return parser;
      }

      if (parsedDoc.openapi && parsedDoc.openapi.startsWith('3.')) {
        const parser = this.parsers.get(DocumentFormat.OPENAPI_V3);
        if (parser) return parser;
      }

      // 检测Postman集合
      if (parsedDoc.info && parsedDoc.item && Array.isArray(parsedDoc.item)) {
        const parser = this.parsers.get(DocumentFormat.POSTMAN);
        if (parser) return parser;
      }

      // 检测Insomnia导出
      if (parsedDoc._type === 'export' && parsedDoc.__export_format === 4) {
        const parser = this.parsers.get(DocumentFormat.INSOMNIA);
        if (parser) return parser;
      }
    } catch (error) {
      // 文档不是有效的JSON，可能是其他格式
    }

    throw new Error('Unable to detect document format or no suitable parser registered');
  }
}
