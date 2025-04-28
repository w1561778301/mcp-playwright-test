import { AbstractBaseParser } from './BaseParser';
import { ParsedAPIDocument, APIDocParserOptions } from '../../types';
import { OpenAPIParser } from './OpenAPIParser';
import * as fs from 'fs';

/**
 * ApiFox格式解析器
 * 注意：ApiFox使用扩展的OpenAPI格式，可以转换为标准OpenAPI后处理
 */
export class ApiFoxParser extends AbstractBaseParser {
  private openAPIParser: OpenAPIParser;

  constructor() {
    super(['apifox']);
    this.openAPIParser = new OpenAPIParser();
  }

  /**
   * 解析ApiFox文档
   * @param docPath 文档路径
   * @param options 解析选项
   */
  async parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 读取ApiFox文件
      const content = fs.readFileSync(docPath, 'utf-8');
      return this.parseContent(content, options);
    } catch (error) {
      console.error('Error parsing ApiFox document:', error);
      throw new Error(`Failed to parse ApiFox document: ${error}`);
    }
  }

  /**
   * 解析ApiFox文档内容
   * @param content 文档内容
   * @param options 解析选项
   */
  async parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 解析JSON内容
      const apiFoxDoc = JSON.parse(content);

      // 转换为标准OpenAPI格式
      const openApiDoc = this.convertToOpenAPI(apiFoxDoc);

      // 使用OpenAPI解析器处理
      const tempFilePath = `temp-openapi-${Date.now()}.json`;
      fs.writeFileSync(tempFilePath, JSON.stringify(openApiDoc));

      try {
        return await this.openAPIParser.parse(tempFilePath, options);
      } finally {
        // 清理临时文件
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      console.error('Error parsing ApiFox content:', error);
      throw new Error(`Failed to parse ApiFox content: ${error}`);
    }
  }

  /**
   * 将ApiFox文档转换为标准OpenAPI格式
   * @param apiFoxDoc ApiFox文档对象
   */
  private convertToOpenAPI(apiFoxDoc: any): any {
    // 复制文档以避免修改原始文档
    const openApiDoc = JSON.parse(JSON.stringify(apiFoxDoc));

    // 处理ApiFox特有的扩展
    if (openApiDoc.apifoxExtension) {
      delete openApiDoc.apifoxExtension;
    }

    // 处理所有路径中的ApiFox特有属性
    if (openApiDoc.paths) {
      for (const pathKey in openApiDoc.paths) {
        const pathItem = openApiDoc.paths[pathKey];

        for (const methodKey in pathItem) {
          const operation = pathItem[methodKey];

          // 移除ApiFox特有的属性
          if (operation.apifoxExtension) {
            delete operation.apifoxExtension;
          }

          // 处理请求体中的ApiFox扩展
          if (operation.requestBody?.content) {
            for (const contentType in operation.requestBody.content) {
              const content = operation.requestBody.content[contentType];

              if (content.apifoxExtension) {
                delete content.apifoxExtension;
              }
            }
          }

          // 处理响应中的ApiFox扩展
          if (operation.responses) {
            for (const statusCode in operation.responses) {
              const response = operation.responses[statusCode];

              if (response.content) {
                for (const contentType in response.content) {
                  const content = response.content[contentType];

                  if (content.apifoxExtension) {
                    delete content.apifoxExtension;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 处理组件中的ApiFox扩展
    if (openApiDoc.components?.schemas) {
      for (const schemaKey in openApiDoc.components.schemas) {
        const schema = openApiDoc.components.schemas[schemaKey];

        if (schema.apifoxExtension) {
          delete schema.apifoxExtension;
        }

        // 递归处理嵌套的模式
        this.processSchemaRecursively(schema);
      }
    }

    return openApiDoc;
  }

  /**
   * 递归处理模式对象中的ApiFox扩展
   * @param schema 模式对象
   */
  private processSchemaRecursively(schema: any): void {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    // 移除当前级别的ApiFox扩展
    if (schema.apifoxExtension) {
      delete schema.apifoxExtension;
    }

    // 处理对象类型的属性
    if (schema.properties) {
      for (const propKey in schema.properties) {
        this.processSchemaRecursively(schema.properties[propKey]);
      }
    }

    // 处理数组类型的项目
    if (schema.items) {
      this.processSchemaRecursively(schema.items);
    }

    // 处理allOf、anyOf、oneOf
    for (const key of ['allOf', 'anyOf', 'oneOf']) {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((subSchema: any) => {
          this.processSchemaRecursively(subSchema);
        });
      }
    }
  }
}
