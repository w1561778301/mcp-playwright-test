/**
 * LLM Integration Module
 *
 * Provides integration with Large Language Models for enhancing
 * test case generation and other AI-powered capabilities.
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import { LLMOptions } from "./types";
import { TestCase, TestStep, APITestCase, APIRequest, APIResponse, APIAssertion } from "../types";

/**
 * Default prompt templates for different LLM tasks
 */
const DEFAULT_PROMPTS = {
  testGeneration: `
You are an expert test engineer tasked with generating comprehensive test cases based on requirements.
Please analyze the following requirements and create detailed, executable test cases.
Each test case should include:
1. A descriptive name
2. A clear description of what is being tested
3. Preconditions
4. Steps to execute
5. Expected results
6. Priority level (High, Medium, Low)

Requirements:
{{requirements}}

Output should be structured test cases in JSON format.
`,

  apiTestGeneration: `
You are an expert API test engineer tasked with generating comprehensive API test cases based on requirements.
Please analyze the following requirements and create detailed, executable API test cases.
Each test case should include:
1. A unique testCaseId
2. A descriptive name
3. A clear description of what is being tested
4. API request details (URL, method, headers, body)
5. Assertions for validating the response
6. Expected status code and response structure

Requirements:
{{requirements}}

Output should be structured API test cases in JSON format.
`,

  testEnhancement: `
You are an expert test engineer tasked with enhancing existing test cases to make them more comprehensive.
Please analyze the following test cases and enhance them by:
1. Adding edge cases
2. Improving assertions
3. Adding validation for error scenarios
4. Ensuring comprehensive coverage of requirements

Test Cases:
{{testCases}}

Output should be the enhanced test cases in the same JSON format.
`,

  errorAnalysis: `
You are an expert test engineer tasked with analyzing test failures and providing insights.
Please analyze the following test results and provide:
1. Root cause analysis for each failure
2. Recommendations for fixing the issues
3. Suggestions for improving the tests

Test Results:
{{testResults}}

Output should be a structured analysis in JSON format.
`,
};

/**
 * Create an LLM client with the provided options
 * @param options LLM configuration options
 */
export function createLLMClient(options: LLMOptions = {}) {
  // Default options
  const llmOptions: Required<LLMOptions> = {
    provider: options.provider || "openai",
    apiKey: options.apiKey || process.env.OPENAI_API_KEY || "",
    apiEndpoint: options.apiEndpoint || "",
    model: options.model || "gpt-4",
    maxTokens: options.maxTokens || 2048,
    temperature: options.temperature || 0.7,
    promptTemplates: options.promptTemplates || {},
  };

  // Merge default prompt templates with custom ones
  const promptTemplates = {
    ...DEFAULT_PROMPTS,
    ...llmOptions.promptTemplates,
  };

  /**
   * Send a request to the LLM provider
   * @param prompt The prompt to send
   * @param customOptions Additional options for the request
   */
  async function sendRequest(prompt: string, customOptions: Partial<LLMOptions> = {}): Promise<string> {
    // Check if API key is available
    if (!llmOptions.apiKey) {
      throw new Error("LLM API key is required");
    }

    // Merge options with any custom options for this request
    const requestOptions = {
      ...llmOptions,
      ...customOptions,
    };

    // Handle different providers
    switch (requestOptions.provider) {
      case "openai":
        return sendOpenAIRequest(prompt, requestOptions);
      case "azure":
        return sendAzureOpenAIRequest(prompt, requestOptions);
      case "anthropic":
        return sendAnthropicRequest(prompt, requestOptions);
      case "local":
        return sendLocalRequest(prompt, requestOptions);
      default:
        throw new Error(`Unsupported LLM provider: ${requestOptions.provider}`);
    }
  }

  /**
   * Send a request to the OpenAI API
   * @param prompt The prompt to send
   * @param options Options for the request
   */
  async function sendOpenAIRequest(prompt: string, options: Required<LLMOptions>): Promise<string> {
    const endpoint = options.apiEndpoint || "https://api.openai.com/v1/chat/completions";

    const requestData = {
      model: options.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
          },
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const response = JSON.parse(data);

              if (response.error) {
                reject(new Error(response.error.message || "OpenAI API error"));
                return;
              }

              resolve(response.choices[0].message.content);
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      req.on("error", reject);
      req.write(JSON.stringify(requestData));
      req.end();
    });
  }

  /**
   * Send a request to the Azure OpenAI API
   * @param prompt The prompt to send
   * @param options Options for the request
   */
  async function sendAzureOpenAIRequest(prompt: string, options: Required<LLMOptions>): Promise<string> {
    // Azure OpenAI implementation would go here
    // This is a placeholder
    throw new Error("Azure OpenAI integration not implemented");
  }

  /**
   * Send a request to the Anthropic API
   * @param prompt The prompt to send
   * @param options Options for the request
   */
  async function sendAnthropicRequest(prompt: string, options: Required<LLMOptions>): Promise<string> {
    // Anthropic implementation would go here
    // This is a placeholder
    throw new Error("Anthropic integration not implemented");
  }

  /**
   * Send a request to a local LLM server
   * @param prompt The prompt to send
   * @param options Options for the request
   */
  async function sendLocalRequest(prompt: string, options: Required<LLMOptions>): Promise<string> {
    // Local LLM implementation would go here
    // This is a placeholder
    throw new Error("Local LLM integration not implemented");
  }

  /**
   * Generate test cases from requirements using LLM
   * @param requirementsText The requirements text
   * @param customOptions Additional options for the request
   */
  async function generateTestCasesFromRequirements(
    requirementsText: string,
    customOptions: Partial<LLMOptions> = {}
  ): Promise<TestCase[]> {
    // Get the prompt template
    const promptTemplate = promptTemplates.testGeneration;

    // Create the prompt
    const prompt = promptTemplate.replace("{{requirements}}", requirementsText);

    // Send the request
    const response = await sendRequest(prompt, customOptions);

    // Parse the response as JSON
    try {
      // Find JSON content within the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TestCase[];
      }

      return JSON.parse(response) as TestCase[];
    } catch (error) {
      console.error("Error parsing LLM response as JSON:", error);
      throw new Error("Could not parse LLM response as test cases");
    }
  }

  /**
   * Generate API test cases from requirements using LLM
   * @param requirementsText The requirements text
   * @param customOptions Additional options for the request
   */
  async function generateAPITestCasesFromRequirements(
    requirementsText: string,
    customOptions: Partial<LLMOptions> = {}
  ): Promise<APITestCase[]> {
    // Get the prompt template
    const promptTemplate = promptTemplates.apiTestGeneration;

    // Create the prompt
    const prompt = promptTemplate.replace("{{requirements}}", requirementsText);

    // Send the request
    const response = await sendRequest(prompt, customOptions);

    // Parse the response as JSON
    try {
      // Find JSON content within the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as APITestCase[];
      }

      return JSON.parse(response) as APITestCase[];
    } catch (error) {
      console.error("Error parsing LLM response as JSON:", error);
      throw new Error("Could not parse LLM response as API test cases");
    }
  }

  /**
   * Enhance existing test cases with LLM
   * @param testCases The test cases to enhance
   * @param customOptions Additional options for the request
   */
  async function enhanceTestCases(
    testCases: TestCase[] | APITestCase[],
    customOptions: Partial<LLMOptions> = {}
  ): Promise<TestCase[] | APITestCase[]> {
    // Get the prompt template
    const promptTemplate = promptTemplates.testEnhancement;

    // Create the prompt
    const prompt = promptTemplate.replace("{{testCases}}", JSON.stringify(testCases, null, 2));

    // Send the request
    const response = await sendRequest(prompt, customOptions);

    // Parse the response as JSON
    try {
      // Find JSON content within the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error("Error parsing LLM response as JSON:", error);
      throw new Error("Could not parse LLM response as enhanced test cases");
    }
  }

  /**
   * Analyze test results with LLM
   * @param testResults The test results to analyze
   * @param customOptions Additional options for the request
   */
  async function analyzeTestResults(testResults: any, customOptions: Partial<LLMOptions> = {}): Promise<any> {
    // Get the prompt template
    const promptTemplate = promptTemplates.errorAnalysis;

    // Create the prompt
    const prompt = promptTemplate.replace("{{testResults}}", JSON.stringify(testResults, null, 2));

    // Send the request
    const response = await sendRequest(prompt, customOptions);

    // Parse the response as JSON
    try {
      // Find JSON content within the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error("Error parsing LLM response as JSON:", error);
      throw new Error("Could not parse LLM response as analysis");
    }
  }

  return {
    sendRequest,
    generateTestCasesFromRequirements,
    generateAPITestCasesFromRequirements,
    enhanceTestCases,
    analyzeTestResults,
  };
}
