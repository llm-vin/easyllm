export interface EasyLLMConfig {
  apiKey: string;
  baseURL?: string;
  provider?: 'llm.vin' | 'openai' | 'custom';
  timeout?: number;
  maxRetries?: number;
  webSearch?: WebSearchOptions;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: 'none' | 'auto' | ToolChoice;
  webSearch?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: string;
  data: Model[];
}

export interface ImageGenerationRequest {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

export interface ModerationRequest {
  input: string | string[];
  model?: string;
  input_images?: string[];
}

export interface ModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      sexual: boolean;
      hate: boolean;
      harassment: boolean;
      'self-harm': boolean;
      violence: boolean;
      [key: string]: boolean;
    };
    category_scores: {
      sexual: number;
      hate: number;
      harassment: number;
      'self-harm': number;
      violence: number;
      [key: string]: number;
    };
  }>;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onProgress?: (chunk: ChatCompletionChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// Function calling types
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;
  enum?: (string | number)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Tool {
  type: 'function';
  function: FunctionDefinition;
}

export interface ToolChoice {
  type: 'function';
  function: {
    name: string;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Helper type for function implementations
export type FunctionImplementation = (args: any) => any | Promise<any>;

// Web search types
export interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  topResultsContent: Array<{
    title: string;
    link: string;
    content: string;
  }>;
}

export interface WebSearchOptions {
  enabled?: boolean;
  maxResults?: number;
  includeContent?: boolean;
}