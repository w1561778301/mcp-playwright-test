import { AbstractBaseParser } from "./BaseParser";
import { ParsedAPIDocument, APIDocParserOptions } from "../../types";
import { OpenAPIParser } from "./OpenAPIParser";

/**
 * Swagger 格式解析器
 * 注意：Swagger 2.0 与 OpenAPI 3.0 兼容性处理，我们使用 OpenAPIParser 进行处理
 */
export class SwaggerParser extends AbstractBaseParser {
  private openAPIParser: OpenAPIParser;

  constructor() {
    super(["swagger"]);
    this.openAPIParser = new OpenAPIParser();
  }

  /**
   * 解析 Swagger 文档
   * @param docPath 文档路径
   * @param options 解析选项
   */
  async parse(docPath: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    // 使用 OpenAPIParser 解析，因为 swagger-parser 库支持 Swagger 2.0 和 OpenAPI 3.0
    return this.openAPIParser.parse(docPath, options);
  }

  /**
   * 解析 Swagger 文档内容
   * @param content 文档内容
   * @param options 解析选项
   */
  async parseContent(content: string, options?: APIDocParserOptions): Promise<ParsedAPIDocument> {
    // 使用 OpenAPIParser 解析内容
    return this.openAPIParser.parseContent(content, options);
  }
}
