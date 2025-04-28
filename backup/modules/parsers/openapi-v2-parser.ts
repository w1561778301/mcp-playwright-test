import { APIRequest, APIResponse } from '../../types';
import {
  APIDocumentParser,
  DocumentFormat,
  ParsedAPIDocument,
  APIEndpoint
} from './parser';

/**
 * OpenAPI V2 (Swagger)格式解析器
 */
export class OpenAPIV2Parser implements APIDocumentParser {
  /**
   * 获取支持的文档格式
   */
  getSupportedFormat(): DocumentFormat {
    return DocumentFormat.OPENAPI_V2;
  }

  /**
   * 解析OpenAPI V2文档
   * @param document OpenAPI V2文档内容
   * @returns 解析后的API文档
   */
  parse(document: string): ParsedAPIDocument {
    try {
      const swaggerDoc = JSON.parse(document);
      const parsedDocument: ParsedAPIDocument = {
        title: swaggerDoc.info.title,
        version: swaggerDoc.info.version,
        description: swaggerDoc.info.description,
        baseUrl: this.extractBaseUrl(swaggerDoc),
        endpoints: this.extractEndpoints(swaggerDoc),
        schemas: swaggerDoc.definitions || {}
      };

      return parsedDocument;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI v2 document: ${(error as Error).message}`);
    }
  }

  /**
   * 提取OpenAPI V2文档中的基础URL
   * @param swaggerDoc OpenAPI V2文档对象
   * @returns 基础URL
   */
  private extractBaseUrl(swaggerDoc: any): string {
    let baseUrl = '';

    // 从主机信息获取URL
    if (swaggerDoc.host) {
      const scheme = swaggerDoc.schemes && swaggerDoc.schemes.length > 0
        ? swaggerDoc.schemes[0]
        : 'https';

      baseUrl = `${scheme}://${swaggerDoc.host}`;

      // 添加基本路径
      if (swaggerDoc.basePath) {
        baseUrl += swaggerDoc.basePath;
      }
    }

    return baseUrl;
  }

  /**
   * 从OpenAPI V2文档中提取端点信息
   * @param swaggerDoc OpenAPI V2文档对象
   * @returns API端点信息数组
   */
  private extractEndpoints(swaggerDoc: any): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    // 遍历所有路径和方法
    Object.entries(swaggerDoc.paths || {}).forEach(([path, pathItem]: [string, any]) => {
      // 处理HTTP方法
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      httpMethods.forEach(method => {
        if (pathItem[method]) {
          const operation = pathItem[method];

          const endpoint: APIEndpoint = {
            path,
            method: method.toUpperCase(),
            summary: operation.summary,
            description: operation.description,
            parameters: operation.parameters,
            requestSchema: this.extractRequestSchema(operation),
            responseSchemas: this.extractResponseSchemas(operation),
            requestExamples: this.extractRequestExamples(operation),
            responseExamples: this.extractResponseExamples(operation),
            headers: this.extractHeaders(operation)
          };

          endpoints.push(endpoint);
        }
      });
    });

    return endpoints;
  }

  /**
   * 提取请求模式
   * @param operation OpenAPI V2操作对象
   * @returns 请求模式
   */
  private extractRequestSchema(operation: any): any {
    if (!operation.parameters) {
      return null;
    }

    // 在OpenAPI V2中，请求体通常通过body或formData参数指定
    const bodyParam = operation.parameters.find((param: any) => param.in === 'body');

    if (bodyParam) {
      return bodyParam.schema;
    }

    // 处理formData参数
    const formParams = operation.parameters.filter((param: any) => param.in === 'formData');

    if (formParams.length > 0) {
      const formSchema = {
        type: 'object',
        properties: {}
      };

      formParams.forEach((param: any) => {
        formSchema.properties[param.name] = {
          type: param.type,
          format: param.format,
          enum: param.enum,
          default: param.default
        };
      });

      return formSchema;
    }

    return null;
  }

  /**
   * 提取响应模式
   * @param operation OpenAPI V2操作对象
   * @returns 按状态码索引的响应模式
   */
  private extractResponseSchemas(operation: any): Record<string, any> {
    const responseSchemas: Record<string, any> = {};

    if (!operation.responses) {
      return responseSchemas;
    }

    Object.entries(operation.responses).forEach(([statusCode, response]: [string, any]) => {
      responseSchemas[statusCode] = response.schema || null;
    });

    return responseSchemas;
  }

  /**
   * 提取请求示例
   * @param operation OpenAPI V2操作对象
   * @returns 请求示例数组
   */
  private extractRequestExamples(operation: any): any[] {
    const examples: any[] = [];

    if (!operation.parameters) {
      return examples;
    }

    const bodyParam = operation.parameters.find((param: any) => param.in === 'body');

    if (bodyParam && bodyParam.examples) {
      Object.values(bodyParam.examples).forEach((example: any) => {
        examples.push(example);
      });
    } else if (bodyParam && bodyParam.example) {
      examples.push(bodyParam.example);
    }

    return examples;
  }

  /**
   * 提取响应示例
   * @param operation OpenAPI V2操作对象
   * @returns 按状态码索引的响应示例数组
   */
  private extractResponseExamples(operation: any): Record<string, any[]> {
    const responseExamples: Record<string, any[]> = {};

    if (!operation.responses) {
      return responseExamples;
    }

    Object.entries(operation.responses).forEach(([statusCode, response]: [string, any]) => {
      if (!response.examples) {
        return;
      }

      responseExamples[statusCode] = [];

      Object.values(response.examples).forEach((example: any) => {
        responseExamples[statusCode].push(example);
      });
    });

    return responseExamples;
  }

  /**
   * 提取请求头
   * @param operation OpenAPI V2操作对象
   * @returns 请求头记录
   */
  private extractHeaders(operation: any): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!operation.parameters) {
      return headers;
    }

    operation.parameters.forEach((param: any) => {
      if (param.in === 'header') {
        headers[param.name] = param.default || '';
      }
    });

    return headers;
  }

  /**
   * 从解析后的文档生成API测试用例
   * @param parsedDocument 解析后的API文档
   * @returns API请求和预期响应测试用例
   */
  generateTestCases(parsedDocument: ParsedAPIDocument): Array<{
    request: APIRequest;
    expectedResponse: Partial<APIResponse>;
  }> {
    const testCases: Array<{
      request: APIRequest;
      expectedResponse: Partial<APIResponse>;
    }> = [];

    parsedDocument.endpoints.forEach(endpoint => {
      // 基本请求对象
      const request: APIRequest = {
        url: this.buildUrl(parsedDocument.baseUrl || '', endpoint.path),
        method: endpoint.method,
        headers: endpoint.headers || {},
        query: {},
        body: null
      };

      // 从参数中提取查询参数
      if (endpoint.parameters) {
        endpoint.parameters.forEach(param => {
          if (param.in === 'query' && param.default) {
            request.query[param.name] = param.default;
          }
        });
      }

      // 从示例或模式中构建请求体
      if (endpoint.requestExamples && endpoint.requestExamples.length > 0) {
        request.body = endpoint.requestExamples[0];
      } else if (endpoint.requestSchema) {
        request.body = this.generateMockDataFromSchema(endpoint.requestSchema);
      }

      // 预期响应
      let expectedResponse: Partial<APIResponse> = {
        status: 200,
        headers: {},
        body: null
      };

      // 从示例或模式中构建预期响应
      const successStatusCodes = Object.keys(endpoint.responseSchemas || {})
        .filter(code => code.startsWith('2'));

      if (successStatusCodes.length > 0) {
        const statusCode = successStatusCodes[0];
        expectedResponse.status = parseInt(statusCode, 10);

        const examples = endpoint.responseExamples?.[statusCode];
        if (examples && examples.length > 0) {
          expectedResponse.body = examples[0];
        } else if (endpoint.responseSchemas?.[statusCode]) {
          expectedResponse.body = this.generateMockDataFromSchema(endpoint.responseSchemas[statusCode]);
        }
      }

      testCases.push({ request, expectedResponse });
    });

    return testCases;
  }

  /**
   * 构建完整URL
   * @param baseUrl 基础URL
   * @param path 路径
   * @returns 完整URL
   */
  private buildUrl(baseUrl: string, path: string): string {
    // 处理基础URL和路径的斜杠
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
      return baseUrl + path.substring(1);
    } else if (!baseUrl.endsWith('/') && !path.startsWith('/')) {
      return baseUrl + '/' + path;
    } else {
      return baseUrl + path;
    }
  }

  /**
   * 从模式生成模拟数据
   * @param schema JSON模式
   * @returns 模拟数据
   */
  private generateMockDataFromSchema(schema: any): any {
    if (!schema) {
      return null;
    }

    // 处理引用
    if (schema.$ref) {
      // 在实际实现中，这里应当解析引用并获取实际模式
      // 为简化，这里返回一个空对象
      return {};
    }

    switch (schema.type) {
      case 'object':
        const obj: Record<string, any> = {};

        if (schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
            obj[propName] = this.generateMockDataFromSchema(propSchema);
          });
        }

        return obj;

      case 'array':
        if (schema.items) {
          // 生成单个项目的数组
          return [this.generateMockDataFromSchema(schema.items)];
        }
        return [];

      case 'string':
        if (schema.format === 'date-time') {
          return new Date().toISOString();
        } else if (schema.format === 'date') {
          return new Date().toISOString().split('T')[0];
        } else if (schema.format === 'email') {
          return 'user@example.com';
        } else if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        } else if (schema.example) {
          return schema.example;
        }
        return 'string';

      case 'number':
      case 'integer':
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        } else if (schema.example !== undefined) {
          return schema.example;
        } else if (schema.minimum !== undefined) {
          return schema.minimum;
        }
        return 0;

      case 'boolean':
        return schema.example !== undefined ? schema.example : false;

      case 'null':
        return null;

      default:
        return null;
    }
  }

  /**
   * 获取指定端点的请求模式
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 请求模式
   */
  getRequestSchema(parsedDocument: ParsedAPIDocument, path: string, method: string): any {
    const endpoint = this.findEndpoint(parsedDocument, path, method);
    return endpoint?.requestSchema || null;
  }

  /**
   * 获取指定端点的响应模式
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 响应模式，按状态码索引
   */
  getResponseSchemas(parsedDocument: ParsedAPIDocument, path: string, method: string): Record<string, any> {
    const endpoint = this.findEndpoint(parsedDocument, path, method);
    return endpoint?.responseSchemas || {};
  }

  /**
   * 获取指定端点的请求示例
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 请求示例列表
   */
  getRequestExamples(parsedDocument: ParsedAPIDocument, path: string, method: string): any[] {
    const endpoint = this.findEndpoint(parsedDocument, path, method);
    return endpoint?.requestExamples || [];
  }

  /**
   * 获取指定端点的响应示例
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 响应示例，按状态码索引
   */
  getResponseExamples(parsedDocument: ParsedAPIDocument, path: string, method: string): Record<string, any[]> {
    const endpoint = this.findEndpoint(parsedDocument, path, method);
    return endpoint?.responseExamples || {};
  }

  /**
   * 在解析后的文档中查找指定端点
   * @param parsedDocument 解析后的API文档
   * @param path API路径
   * @param method HTTP方法
   * @returns 找到的端点，如果未找到则返回undefined
   */
  private findEndpoint(parsedDocument: ParsedAPIDocument, path: string, method: string): APIEndpoint | undefined {
    return parsedDocument.endpoints.find(endpoint =>
      endpoint.path === path && endpoint.method.toUpperCase() === method.toUpperCase()
    );
  }
}
