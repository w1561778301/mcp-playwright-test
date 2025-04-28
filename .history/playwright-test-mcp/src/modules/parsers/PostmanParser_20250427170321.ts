import { AbstractBaseParser } from "./BaseParser";
import { ParsedAPIDocument, APIDocParserOptions, APIEndpoint, APITestCase } from "../../types";
import * as fs from "fs";
import * as path from "path";

/**
 * Postman集合格式解析器
 */
export class PostmanParser extends AbstractBaseParser {
  constructor() {
    super(["postman"]);
  }

  /**
   * 解析Postman集合文档
   * @param docPath 文档路径
   * @param options 解析选项
   */
  async parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 读取Postman集合文件
      const content = fs.readFileSync(docPath, "utf-8");
      return this.parseContent(content, options);
    } catch (error) {
      console.error("Error parsing Postman collection:", error);
      throw new Error(`Failed to parse Postman collection: ${error}`);
    }
  }

  /**
   * 解析Postman集合内容
   * @param content 文档内容
   * @param options 解析选项
   */
  async parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    try {
      // 解析JSON内容
      const collection = JSON.parse(content);

      // 验证是否为Postman集合
      if (!collection.info || !collection.item) {
        throw new Error("Invalid Postman collection format");
      }

      return this.processPostmanCollection(collection, options);
    } catch (error) {
      console.error("Error parsing Postman collection content:", error);
      throw new Error(`Failed to parse Postman collection content: ${error}`);
    }
  }

  /**
   * 处理Postman集合对象
   * @param collection Postman集合对象
   * @param options 解析选项
   */
  private processPostmanCollection(collection: any, options?: APIDocParserOptions): ParsedAPIDocument {
    const result: ParsedAPIDocument = {
      endpoints: [],
      schemas: {},
      info: {
        title: collection.info.name || "Postman Collection",
        version: collection.info.version || "1.0.0",
        description: collection.info.description,
      },
    };

    // 递归处理集合中的所有项目
    this.processItems(collection.item, "", result.endpoints);

    // 生成测试用例
    return this.generateTestCases(result, options);
  }

  /**
   * 递归处理Postman集合中的项目
   * @param items 项目数组
   * @param folderPath 当前文件夹路径
   * @param endpoints 端点数组，用于存储结果
   */
  private processItems(items: any[], folderPath: string, endpoints: APIEndpoint[]): void {
    for (const item of items) {
      if (item.item) {
        // 这是一个文件夹，递归处理
        const newPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        this.processItems(item.item, newPath, endpoints);
      } else if (item.request) {
        // 这是一个请求，处理它
        this.processRequest(item, folderPath, endpoints);
      }
    }
  }

  /**
   * 处理单个Postman请求
   * @param item Postman请求项
   * @param folderPath 文件夹路径
   * @param endpoints 端点数组，用于存储结果
   */
  private processRequest(item: any, folderPath: string, endpoints: APIEndpoint[]): void {
    const request = item.request;

    // 提取URL
    let url = "";
    if (typeof request.url === "string") {
      url = request.url;
    } else if (request.url && request.url.raw) {
      url = request.url.raw;

      // 尝试提取路径部分
      if (request.url.path) {
        url = "/" + request.url.path.join("/");
      }
    }

    // 提取方法
    const method = request.method || "GET";

    // 创建端点
    const endpoint: APIEndpoint = {
      path: url,
      method: method.toUpperCase(),
      summary: item.name || "",
      description: request.description || "",
      requestSchema: this.buildRequestSchema(request),
      responseSchema: this.buildResponseSchema(item.response),
      requestExamples: this.extractRequestExamples(request),
      responseExamples: this.extractResponseExamples(item.response),
    };

    endpoints.push(endpoint);
  }

  /**
   * 构建请求模式
   * @param request Postman请求对象
   */
  private buildRequestSchema(request: any): any {
    const schema: any = {
      parameters: {
        path: {},
        query: {},
        header: {},
      },
      body: undefined,
    };

    // 处理URL参数
    if (request.url && request.url.variable) {
      request.url.variable.forEach((variable: any) => {
        schema.parameters.path[variable.key] = {
          type: "string",
          description: variable.description || "",
        };
      });
    }

    // 处理查询参数
    if (request.url && request.url.query) {
      request.url.query.forEach((query: any) => {
        schema.parameters.query[query.key] = {
          type: "string",
          description: query.description || "",
        };
      });
    }

    // 处理请求头
    if (request.header) {
      request.header.forEach((header: any) => {
        schema.parameters.header[header.key] = {
          type: "string",
          description: header.description || "",
        };
      });
    }

    // 处理请求体
    if (request.body) {
      if (request.body.mode === "raw" && request.body.raw) {
        try {
          // 尝试解析JSON请求体
          const jsonBody = JSON.parse(request.body.raw);
          schema.body = this.inferSchema(jsonBody);
        } catch (e) {
          // 不是JSON，可能是其他格式
          schema.body = {
            type: "string",
            example: request.body.raw,
          };
        }
      } else if (request.body.mode === "formdata" && request.body.formdata) {
        schema.body = {
          type: "object",
          properties: {},
        };

        request.body.formdata.forEach((param: any) => {
          schema.body.properties[param.key] = {
            type: param.type === "file" ? "file" : "string",
            description: param.description || "",
          };
        });
      } else if (request.body.mode === "urlencoded" && request.body.urlencoded) {
        schema.body = {
          type: "object",
          properties: {},
        };

        request.body.urlencoded.forEach((param: any) => {
          schema.body.properties[param.key] = {
            type: "string",
            description: param.description || "",
          };
        });
      }
    }

    return schema;
  }

  /**
   * 构建响应模式
   * @param responses Postman响应数组
   */
  private buildResponseSchema(responses: any[]): any {
    if (!responses || responses.length === 0) {
      return { "200": { description: "OK" } };
    }

    const schema: any = {};

    for (const response of responses) {
      const statusCode = response.code || 200;

      schema[statusCode] = {
        description: response.name || response.status || "Response",
        content: {},
      };

      // 尝试解析响应体
      if (response.body) {
        try {
          const contentType =
            response.header?.find((h: any) => h.key.toLowerCase() === "content-type")?.value || "application/json";
          let bodySchema;

          // 尝试解析JSON
          try {
            const json = JSON.parse(response.body);
            bodySchema = this.inferSchema(json);
          } catch (e) {
            // 非JSON响应
            bodySchema = {
              type: "string",
              example: response.body,
            };
          }

          schema[statusCode].content[contentType] = bodySchema;
        } catch (e) {
          console.warn(`Failed to parse response body for ${response.name || "unnamed response"}`);
        }
      }
    }

    return schema;
  }

  /**
   * 从值推断模式
   * @param value 要推断模式的值
   */
  private inferSchema(value: any, optional = false): any {
    if (value === null || value === undefined) {
      return { type: "null" };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { type: "array", items: {} };
      }

      // 推断数组元素的类型
      const itemSchema = this.inferSchema(value[0]);
      return { type: "array", items: itemSchema };
    }

    if (typeof value === "object") {
      const schema: any = {
        type: "object",
        properties: {},
      };

      for (const [key, propValue] of Object.entries(value)) {
        schema.properties[key] = this.inferSchema(propValue, true);
      }

      return schema;
    }

    // 基本类型
    return { type: typeof value };
  }

  /**
   * 提取请求示例
   * @param request Postman请求对象
   */
  private extractRequestExamples(request: any): any[] {
    const examples: any[] = [];

    if (request.body) {
      if (request.body.mode === "raw" && request.body.raw) {
        // 对于原始请求体，尝试判断格式
        let contentType = "text/plain";
        if (request.header) {
          const contentTypeHeader = request.header.find((h: any) => h.key.toLowerCase() === "content-type");
          if (contentTypeHeader) {
            contentType = contentTypeHeader.value;
          }
        }

        try {
          // 如果是JSON，解析它
          if (contentType.includes("json")) {
            examples.push({
              name: "Example",
              contentType,
              value: JSON.parse(request.body.raw),
            });
          } else {
            examples.push({
              name: "Example",
              contentType,
              value: request.body.raw,
            });
          }
        } catch (e) {
          // 如果解析失败，保留原始字符串
          examples.push({
            name: "Example",
            contentType,
            value: request.body.raw,
          });
        }
      } else if (request.body.mode === "formdata" && request.body.formdata) {
        // 对于表单数据，创建对象
        const formData: any = {};
        request.body.formdata.forEach((item: any) => {
          formData[item.key] = item.value;
        });

        examples.push({
          name: "Form Data Example",
          contentType: "multipart/form-data",
          value: formData,
        });
      } else if (request.body.mode === "urlencoded" && request.body.urlencoded) {
        // 对于URL编码数据，创建对象
        const formData: any = {};
        request.body.urlencoded.forEach((item: any) => {
          formData[item.key] = item.value;
        });

        examples.push({
          name: "URL Encoded Example",
          contentType: "application/x-www-form-urlencoded",
          value: formData,
        });
      }
    }

    return examples;
  }

  /**
   * 提取响应示例
   * @param responses Postman响应数组
   */
  private extractResponseExamples(responses: any[]): any[] {
    if (!responses || responses.length === 0) {
      return [];
    }

    const examples: any[] = [];

    for (const response of responses) {
      if (response.body) {
        let contentType = "application/json";
        if (response.header) {
          const contentTypeHeader = Array.isArray(response.header)
            ? response.header.find((h: any) => h.key.toLowerCase() === "content-type")
            : undefined;

          if (contentTypeHeader) {
            contentType = contentTypeHeader.value;
          }
        }

        try {
          // 如果是JSON，解析它
          if (contentType.includes("json")) {
            examples.push({
              name: response.name || "Example",
              statusCode: response.code || 200,
              contentType,
              value: JSON.parse(response.body),
            });
          } else {
            examples.push({
              name: response.name || "Example",
              statusCode: response.code || 200,
              contentType,
              value: response.body,
            });
          }
        } catch (e) {
          // 如果解析失败，保留原始字符串
          examples.push({
            name: response.name || "Example",
            statusCode: response.code || 200,
            contentType,
            value: response.body,
          });
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
    document.endpoints.forEach((endpoint) => {
      if (!endpoint.testCases) {
        endpoint.testCases = [];
      }

      // 基本的测试用例 - 状态码验证
      const baseCase: APITestCase = {
        id: `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[\/{}]/g, "-")}-${Date.now()}`,
        description: `Test ${endpoint.method} ${endpoint.path}`,
        endpoint: endpoint.path,
        method: endpoint.method,
        assertions: [{ type: "status", target: "status", operator: "=", value: 200 }],
      };

      // 添加请求头信息
      if (endpoint.requestSchema && endpoint.requestSchema.parameters && endpoint.requestSchema.parameters.header) {
        const headers: Record<string, string> = {};

        for (const [key, value] of Object.entries(endpoint.requestSchema.parameters.header)) {
          // 仅添加常见的头信息
          if (key.toLowerCase() === "content-type" || key.toLowerCase() === "accept") {
            headers[key] = (value as any).example || "application/json";
          }
        }

        if (Object.keys(headers).length > 0) {
          baseCase.headers = headers;
        }
      }

      // 添加请求体
      if (endpoint.requestExamples && endpoint.requestExamples.length > 0) {
        const requestExample = endpoint.requestExamples[0];
        if (typeof requestExample.value === "object") {
          baseCase.body = requestExample.value;
        }
      }

      // 添加响应体验证
      if (endpoint.responseExamples && endpoint.responseExamples.length > 0) {
        const responseExample = endpoint.responseExamples[0];

        if (typeof responseExample.value === "object") {
          // 从示例中提取关键字段进行验证
          Object.entries(responseExample.value).forEach(([key, value]) => {
            if (typeof value !== "object") {
              baseCase.assertions.push({
                type: "body",
                target: key,
                operator: typeof value === "string" ? "contains" : "=",
                value: value,
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
