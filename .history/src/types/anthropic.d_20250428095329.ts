declare module '@anthropic-ai/sdk' {
  export class Anthropic {
    constructor(options: { apiKey: string });

    messages: {
      create(params: {
        model: string;
        max_tokens: number;
        system: string;
        messages: Array<{
          role: string;
          content: string | { type: string; text: string };
        }>;
      }): Promise<{
        content: Array<{
          type: string;
          text: string;
        }>;
      }>;
    };
  }
}
