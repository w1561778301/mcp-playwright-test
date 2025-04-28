import { ParserFactory } from './parser';
import { OpenApiV3Parser } from './openApiV3Parser';

// Register available parsers
const openApiV3Parser = new OpenApiV3Parser();
ParserFactory.registerParser(openApiV3Parser);

// Export factory and parsers
export { ParserFactory, OpenApiV3Parser };

// Export parser types
export * from './parser';
