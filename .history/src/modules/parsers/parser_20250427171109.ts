import { APIRequest, APIResponse } from '../../types';

/**
 * Supported document formats
 */
export enum DocumentFormat {
  OPENAPI_V3 = 'openapi-v3',
  OPENAPI_V2 = 'openapi-v2',
  POSTMAN = 'postman',
  INSOMNIA = 'insomnia',
  CUSTOM = 'custom'
}

/**
 * API endpoint information
 */
export interface APIEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  parameters: Record<string, any>;
  requestSchema: Record<string, any>;
  responseSchemas: Record<string, any>;
  requestExamples: any[];
  responseExamples: any[];
  headers: Record<string, any>;
}

/**
 * Parsed API document
 */
export interface ParsedAPIDocument {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  schemas: Record<string, any>;
}

/**
 * Interface for API document parsers
 */
export interface APIDocumentParser {
  /**
   * Get supported document formats
   * @returns Array of supported document formats
   */
  getSupportedFormats(): DocumentFormat[];
  
  /**
   * Parse an API document
   * @param filePath Path to the API document file
   * @returns Parsed API document
   */
  parseDocument(filePath: string): Promise<ParsedAPIDocument>;
  
  /**
   * Generate test cases from a parsed API document
   * @param parsedDocument Parsed API document
   * @returns Array of API test cases
   */
  generateTestCases(parsedDocument: ParsedAPIDocument): Promise<any[]>;
}

/**
 * API document parser factory
 */
export class ParserFactory {
  private static parsers: APIDocumentParser[] = [];
  
  /**
   * Register a parser
   * @param parser Parser to register
   */
  static registerParser(parser: APIDocumentParser): void {
    this.parsers.push(parser);
  }
  
  /**
   * Get a parser for a specific document format
   * @param format Document format
   * @returns Parser for the specified format, or undefined if not found
   */
  static getParser(format: DocumentFormat): APIDocumentParser | undefined {
    return this.parsers.find(parser => 
      parser.getSupportedFormats().includes(format)
    );
  }
  
  /**
   * Auto-detect the document format and return the appropriate parser
   * @param filePath Path to the document file
   * @returns Promise resolving to the detected parser, or undefined if not detected
   */
  static async detectParser(filePath: string): Promise<APIDocumentParser | undefined> {
    // For simplicity, we're implementing a very basic detection mechanism
    // In a real implementation, this would be more sophisticated
    
    // Try each parser until one succeeds
    for (const parser of this.parsers) {
      try {
        await parser.parseDocument(filePath);
        return parser;
      } catch (error) {
        // Continue to the next parser
      }
    }
    
    return undefined;
  }
}
