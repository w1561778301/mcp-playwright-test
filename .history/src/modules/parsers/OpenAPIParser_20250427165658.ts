import { AbstractBaseParser } from './BaseParser';
import { ParsedAPIDocument, APIDocParserOptions, APIEndpoint, APITestCase } from '../../types';
import * as SwaggerParser from 'swagger-parser';
import * as fs from 'fs';

/**
 * OpenAPI格式解析器
 */
export class OpenAPIParser extends AbstractBaseParser {
  constructor() {
    super(['openapi']);
  }

  /**
   * 解析OpenAPI文档文件
   * @param docPath 文档路径
   * @param options 解析选项
   */
  async parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 使用swagger-parser库解析文档
      const api = await SwaggerParser.validate(docPath);

      return this.processOpenAPIDocument(api, options);
    } catch (error) {
      console.error('Error parsing OpenAPI document:', error);
      throw new Error(`Failed to parse OpenAPI document: ${error}`);
    }
  }

  /**
   * 解析OpenAPI文档内容
   * @param content 文档内容
   * @param options 解析选项
   */
  async parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 将内容临时写入文件并解析
      const tempFilePath = `temp-openapi-${Date.now()}.json`;
      fs.writeFileSync(tempFilePath, content);

      try {
        const result = await this.parse(tempFilePath, options);
        return result;
      } finally {
        // 清理临时文件
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      console.error('Error parsing OpenAPI content:', error);
      throw new Error(`Failed to parse OpenAPI content: ${error}`);
    }
  }

  /**
   * 处理OpenAPI文档对象
   * @param api 解析后的OpenAPI文档对象
   * @param options 解析选项
   */
  private processOpenAPIDocument(api: any, options?: APIDocParserOptions): ParsedAPIDocument {
    const result: ParsedAPIDocument = {
      endpoints: [],
      schemas: api.components?.schemas || {},
      info: {
        title: api.info.title || 'OpenAPI Document',
        version: api.info.version || '1.0.0',
        description: api.info.description,
      },
    };

    // 处理所有路径和操作
    for (const [path, pathItem] of Object.entries<any>(api.paths || {})) {
      for (const [method, operation] of Object.entries<any>(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          const endpoint: APIEndpoint = {
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            requestSchema: this.buildRequestSchema(operation),
            responseSchema: this.buildResponseSchema(operation),
            requestExamples: this.extractRequestExamples(operation),
            responseExamples: this.extractResponseExamples(operation),
          };

          result.endpoints.push(endpoint);
        }
      }
    }

    // 生成测试用例
    return this.generateTestCases(result, options);
  }

  /**
   * 构建请求模式
   * @param operation API操作对象
   */
  private buildRequestSchema(operation: any): any {
    const schema: any = {
      parameters: {},
      body: undefined,
    };

    // 处理路径参数、查询参数和头信息
    (operation.parameters || []).forEach((param: any) => {
      if (!schema.parameters[param.in]) {
        schema.parameters[param.in] = {};
      }
      schema.parameters[param.in][param.name] = param.schema || { type: 'string' };
    });

    // 处理请求体
    if (operation.requestBody) {
      const content = operation.requestBody.content || {};
      const contentType = Object.keys(content)[0];

      if (contentType && content[contentType].schema) {
        schema.body = content[contentType].schema;
      }
    }

    return schema;
  }

  /**
   * 构建响应模式
   * @param operation API操作对象
   */
  private buildResponseSchema(operation: any): any {
    const schema: any = {};

    // 处理所有响应
    for (const [statusCode, response] of Object.entries<any>(operation.responses || {})) {
      schema[statusCode] = {
        description: response.description || '',
        content: {},
      };

      // 处理响应内容
      if (response.content) {
        for (const [contentType, content] of Object.entries<any>(response.content)) {
          schema[statusCode].content[contentType] = content.schema;
        }
      }
    }

    return schema;
  }

  /**
   * 提取请求示例
   * @param operation API操作对象
   */
  private extractRequestExamples(operation: any): any[] {
    const examples: any[] = [];

    // 从请求体中提取示例
    if (operation.requestBody?.content) {
      for (const [contentType, content] of Object.entries<any>(operation.requestBody.content)) {
        if (content.examples) {
          for (const [name, example] of Object.entries<any>(content.examples)) {
            examples.push({
              name,
              contentType,
              value: example.value,
            });
          }
        } else if (content.example) {
          examples.push({
            name: 'Example',
            contentType,
            value: content.example,
          });
        }
      }
    }

    return examples;
  }

  /**
   * 提取响应示例
   * @param operation API操作对象
   */
  private extractResponseExamples(operation: any): any[] {
    const examples: any[] = [];

    // 从响应中提取示例
    for (const [statusCode, response] of Object.entries<any>(operation.responses || {})) {
      if (response.content) {
        for (const [contentType, content] of Object.entries<any>(response.content)) {
          if (content.examples) {
            for (const [name, example] of Object.entries<any>(content.examples)) {
              examples.push({
                name,
                statusCode,
                contentType,
                value: example.value,
              });
            }
          } else if (content.example) {
            examples.push({
              name: 'Example',
              statusCode,
              contentType,
              value: content.example,
            });
          }
        }
      }
    }

    return examples;
  }

  /**
   * 为解析后的文档生成测试用例
   * @param document 解析后的API文档
   * @param options 解析选项
   */
  private generateTestCases(document: ParsedAPIDocument, options?: APIDocParserOptions): ParsedAPIDocument {
    // 为每个端点生成测试用例
    document.endpoints.forEach(endpoint => {
      if (!endpoint.testCases) {
        endpoint.testCases = [];
      }

      // 获取可能的成功状态码
      const successStatusCodes = Object.keys(endpoint.responseSchema || {})
        .filter(code => code.startsWith('2'))
        .map(code => parseInt(code, 10));

      const statusCode = successStatusCodes[0] ||
                          options?.defaultStatusCode ||
                          200;

      // 1. 基本测试用例 - 状态码验证
      const baseCase: APITestCase = {
        id: `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[\/{}]/g, '-')}-${Date.now()}`,
        description: `Test ${endpoint.method} ${endpoint.path}`,
        endpoint: endpoint.path,
        method: endpoint.method,
        assertions: [
          { type: 'status', target: 'status', operator: '=', value: statusCode }
        ]
      };

      // 添加响应体验证（如果有示例）
      if (endpoint.responseExamples && endpoint.responseExamples.length > 0) {
        // 找到成功状态码的示例
        const successExample = endpoint.responseExamples.find(ex =>
          ex.statusCode && successStatusCodes.includes(parseInt(ex.statusCode, 10))
        );

        if (successExample && typeof successExample.value === 'object') {
          // 从示例中提取关键字段进行验证
          Object.entries(successExample.value).forEach(([key, value]) => {
            if (typeof value !== 'object') {
              baseCase.assertions.push({
                type: 'body',
                target: key,
                operator: typeof value === 'string' ? 'contains' : '=',
                value: value
              });
            }
          });
        }
      }

      endpoint.testCases.push(baseCase);
    });

    return document;
  }
}
