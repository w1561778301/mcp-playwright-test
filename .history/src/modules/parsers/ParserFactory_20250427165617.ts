import { BaseParser } from "./BaseParser";
import { OpenAPIParser } from "./OpenAPIParser";
import { PostmanParser } from "./PostmanParser";
import { SwaggerParser } from "./SwaggerParser";
import { ApiFoxParser } from "./ApiFoxParser";
import { DocumentFormat } from "../../types";
import * as fs from "fs";
import * as path from "path";

/**
 * API文档解析器工厂类
 */
export class ParserFactory {
  private static instance: ParserFactory;
  private parsers: BaseParser[] = [];

  /**
   * 私有构造函数，注册所有可用的解析器
   */
  private constructor() {
    // 注册所有支持的解析器
    this.registerParser(new OpenAPIParser());
    this.registerParser(new SwaggerParser());
    this.registerParser(new PostmanParser());
    this.registerParser(new ApiFoxParser());
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ParserFactory {
    if (!ParserFactory.instance) {
      ParserFactory.instance = new ParserFactory();
    }
    return ParserFactory.instance;
  }

  /**
   * 注册新的解析器
   * @param parser 要注册的解析器
   */
  public registerParser(parser: BaseParser): void {
    this.parsers.push(parser);
  }

  /**
   * 获取支持指定格式的解析器
   * @param format 文档格式
   * @returns 解析器，如果不支持返回undefined
   */
  public getParser(format: DocumentFormat): BaseParser | undefined {
    // 如果格式为'auto'，则尝试自动检测
    if (format === "auto") {
      // 在自动模式下，无法获取特定解析器
      // 请在parse方法中使用自动检测
      return undefined;
    }

    return this.parsers.find((parser) => parser.supports(format));
  }

  /**
   * 检测文件格式并返回相应的解析器
   * @param filePath 文件路径
   * @returns 检测到的格式和相应的解析器
   */
  public detectFormat(filePath: string): { format: DocumentFormat; parser: BaseParser } | undefined {
    // 读取文件扩展名和内容
    const ext = path.extname(filePath).toLowerCase();

    try {
      // 读取文件前几行来检测格式
      const content = fs.readFileSync(filePath, "utf-8");

      // 首先尝试解析为JSON
      if (ext === ".json" || ext === ".postman_collection.json") {
        try {
          const json = JSON.parse(content);

          // Postman集合格式检测
          if (json.info && json.item && Array.isArray(json.item)) {
            return { format: "postman", parser: this.getParser("postman")! };
          }

          // OpenAPI/Swagger格式检测
          if (json.openapi || json.swagger) {
            if (json.openapi && json.openapi.startsWith("3.")) {
              return { format: "openapi", parser: this.getParser("openapi")! };
            }
            if (json.swagger && json.swagger.startsWith("2.")) {
              return { format: "swagger", parser: this.getParser("swagger")! };
            }
          }
        } catch (e) {
          // 解析JSON失败，继续其他检测
        }
      }

      // YAML格式检测
      if (ext === ".yaml" || ext === ".yml") {
        // 简单检测OpenAPI/Swagger YAML格式
        if (content.includes("openapi:") || content.includes("swagger:")) {
          if (content.includes("openapi: 3")) {
            return { format: "openapi", parser: this.getParser("openapi")! };
          }
          if (content.includes("swagger: 2")) {
            return { format: "swagger", parser: this.getParser("swagger")! };
          }
        }
      }

      // ApiFox格式检测
      if (ext === ".apifox.json" || content.includes('"apifoxModel"') || content.includes('"apifoxExtension"')) {
        return { format: "apifox", parser: this.getParser("apifox")! };
      }
    } catch (error) {
      console.error(`Error detecting format for file ${filePath}:`, error);
    }

    return undefined;
  }

  /**
   * 解析API文档文件
   * @param filePath 文件路径
   * @param format 指定格式，如果为'auto'则自动检测
   * @returns 解析后的文档结构
   */
  public async parseFile(filePath: string, format: DocumentFormat = "auto"): Promise<any> {
    if (format === "auto") {
      // 自动检测格式
      const detected = this.detectFormat(filePath);
      if (!detected) {
        throw new Error(`Could not detect format for file: ${filePath}`);
      }

      // 使用检测到的解析器解析文件
      return await detected.parser.parse(filePath);
    } else {
      // 使用指定格式的解析器
      const parser = this.getParser(format);
      if (!parser) {
        throw new Error(`No parser available for format: ${format}`);
      }

      return await parser.parse(filePath);
    }
  }
}
