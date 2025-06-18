import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  EasyLLMConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  StreamOptions,
  ModelsResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModerationRequest,
  ModerationResponse,
  WebSearchOptions,
  FileMessage,
  FileUploadOptions,
  ChatMessage,
} from './types';

export class EasyLLM {
  private client: AxiosInstance;
  private config: EasyLLMConfig;

  constructor(config: EasyLLMConfig) {
    this.config = {
      baseURL: 'https://api.llm.vin/v1',
      provider: 'llm.vin',
      timeout: 30000,
      maxRetries: 3,
      ...config,
      webSearch: {
        enabled: false,
        maxResults: 5,
        includeContent: true,
        ...config.webSearch,
      },
    };

    if (this.config.provider === 'openai') {
      this.config.baseURL = 'https://api.openai.com/v1';
    }

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status >= 500 && this.config.maxRetries! > 0) {
          return this.retryRequest(error.config);
        }
        throw error;
      }
    );
  }

  private async retryRequest(config: AxiosRequestConfig, retryCount = 0): Promise<any> {
    if (retryCount >= this.config.maxRetries!) {
      throw new Error('Max retries exceeded');
    }

    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    
    try {
      return await this.client.request(config);
    } catch (error) {
      return this.retryRequest(config, retryCount + 1);
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (request.stream) {
      throw new Error('Use createChatCompletionStream() for streaming requests');
    }
    const response = await this.client.post('/chat/completions', request);
    return response.data;
  }

  async createChatCompletionStream(
    request: ChatCompletionRequest,
    options?: StreamOptions
  ): Promise<AsyncGenerator<ChatCompletionChunk, void, unknown>> {
    const streamRequest = { ...request, stream: true };
    
    return this.streamChatCompletion(streamRequest, options);
  }

  private async *streamChatCompletion(
    request: ChatCompletionRequest,
    options?: StreamOptions
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        options?.onError?.(error);
        throw error;
      }

      if (!response.body) {
        const error = new Error('No response body for streaming');
        options?.onError?.(error);
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            options?.onComplete?.();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine === '') continue;
            if (trimmedLine === 'data: [DONE]') {
              options?.onComplete?.();
              return;
            }
            if (!trimmedLine.startsWith('data: ')) continue;

            try {
              const jsonStr = trimmedLine.slice(6);
              const chunk: ChatCompletionChunk = JSON.parse(jsonStr);
              
              options?.onProgress?.(chunk);
              yield chunk;
            } catch (parseError) {
              console.warn('Failed to parse SSE chunk:', trimmedLine);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
      throw err;
    }
  }

  async listModels(): Promise<ModelsResponse> {
    const response = await this.client.get('/models');
    return response.data;
  }

  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const response = await this.client.post('/images/generations', request);
    return response.data;
  }

  async createModeration(request: ModerationRequest): Promise<ModerationResponse> {
    const response = await this.client.post('/moderations', request);
    return response.data;
  }

  /**
   * Create a chat completion with automatic web search support.
   * This will enable webSearch if the current config allows it and the model supports it.
   */
  async createChatCompletionWithWebSearch(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const webSearchRequest = this.enhanceRequestWithWebSearch(request);
    return this.createChatCompletion(webSearchRequest);
  }

  /**
   * Create a streaming chat completion with automatic web search support.
   */
  async createChatCompletionStreamWithWebSearch(
    request: ChatCompletionRequest,
    options?: StreamOptions
  ): Promise<AsyncGenerator<ChatCompletionChunk, void, unknown>> {
    const webSearchRequest = this.enhanceRequestWithWebSearch(request);
    return this.createChatCompletionStream(webSearchRequest, options);
  }

  /**
   * Enhance a chat completion request with web search if enabled
   */
  private enhanceRequestWithWebSearch(request: ChatCompletionRequest): ChatCompletionRequest {
    // If web search is already explicitly set in the request, respect that
    if (request.webSearch !== undefined) {
      return request;
    }

    // If global web search is enabled, add it to the request
    if (this.config.webSearch?.enabled) {
      return {
        ...request,
        webSearch: true,
      };
    }

    return request;
  }

  /**
   * Enable or disable web search globally for this client instance
   */
  setWebSearchEnabled(enabled: boolean): void {
    if (!this.config.webSearch) {
      this.config.webSearch = {
        enabled: false,
        maxResults: 5,
        includeContent: true,
      };
    }
    this.config.webSearch.enabled = enabled;
  }

  /**
   * Check if web search is currently enabled
   */
  isWebSearchEnabled(): boolean {
    return this.config.webSearch?.enabled ?? false;
  }

  /**
   * Create file role messages from file data
   */
  createFileMessages(files: FileMessage[], options?: FileUploadOptions): ChatMessage[] {
    const defaultOptions: FileUploadOptions = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8',
      ...options,
    };

    return files.map((file) => {
      // Validate file size if specified
      if (defaultOptions.maxFileSize && file.content.length > defaultOptions.maxFileSize) {
        throw new Error(`File ${file.fileName} exceeds maximum size of ${defaultOptions.maxFileSize} bytes`);
      }

      // Validate file extension if specified
      if (defaultOptions.allowedExtensions) {
        const extension = file.fileName.split('.').pop()?.toLowerCase();
        if (!extension || !defaultOptions.allowedExtensions.includes(extension)) {
          throw new Error(`File ${file.fileName} has unsupported extension. Allowed: ${defaultOptions.allowedExtensions.join(', ')}`);
        }
      }

      // Limit fileName to 50 characters as per API requirements
      const truncatedFileName = file.fileName.length > 50 ? file.fileName.substring(0, 50) : file.fileName;

      return {
        role: 'file' as const,
        content: file.content,
        fileName: truncatedFileName,
      };
    });
  }

  /**
   * Create a chat completion with file uploads
   */
  async createChatCompletionWithFiles(
    request: Omit<ChatCompletionRequest, 'messages'> & { messages: ChatMessage[] },
    files: FileMessage[],
    options?: FileUploadOptions
  ): Promise<ChatCompletionResponse> {
    const fileMessages = this.createFileMessages(files, options);
    const requestWithFiles: ChatCompletionRequest = {
      ...request,
      messages: [...fileMessages, ...request.messages],
    };

    return this.createChatCompletion(requestWithFiles);
  }

  /**
   * Create a streaming chat completion with file uploads
   */
  async createChatCompletionStreamWithFiles(
    request: Omit<ChatCompletionRequest, 'messages'> & { messages: ChatMessage[] },
    files: FileMessage[],
    streamOptions?: StreamOptions,
    fileOptions?: FileUploadOptions
  ): Promise<AsyncGenerator<ChatCompletionChunk, void, unknown>> {
    const fileMessages = this.createFileMessages(files, fileOptions);
    const requestWithFiles: ChatCompletionRequest = {
      ...request,
      messages: [...fileMessages, ...request.messages],
    };

    return this.createChatCompletionStream(requestWithFiles, streamOptions);
  }

  /**
   * Helper method to read file content from different sources
   */
  static async readFileContent(file: File | Buffer | string, fileName?: string): Promise<FileMessage> {
    if (typeof file === 'string') {
      // Assume it's file content as string
      return {
        fileName: fileName || 'untitled.txt',
        content: file,
      };
    }

    if (Buffer.isBuffer(file)) {
      // Node.js Buffer
      return {
        fileName: fileName || 'untitled.txt',
        content: file.toString('utf-8'),
      };
    }

    if (typeof File !== 'undefined' && file instanceof File) {
      // Browser File object
      return new Promise((resolve, reject) => {
        if (typeof (globalThis as any).FileReader === 'undefined') {
          reject(new Error('FileReader is not available in this environment'));
          return;
        }
        
        const FileReaderClass = (globalThis as any).FileReader;
        const reader = new FileReaderClass();
        reader.onload = (e: any) => {
          resolve({
            fileName: file.name,
            content: e.target?.result as string,
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    throw new Error('Unsupported file type. Expected string, Buffer, or File object.');
  }

  get chat() {
    return {
      completions: {
        create: (request: ChatCompletionRequest) => {
          if (request.stream) {
            return this.createChatCompletionStream(request);
          }
          return this.createChatCompletion(request);
        },
        stream: (request: ChatCompletionRequest, options?: StreamOptions) => 
          this.createChatCompletionStream(request, options),
        createWithWebSearch: (request: ChatCompletionRequest) => {
          if (request.stream) {
            return this.createChatCompletionStreamWithWebSearch(request);
          }
          return this.createChatCompletionWithWebSearch(request);
        },
        streamWithWebSearch: (request: ChatCompletionRequest, options?: StreamOptions) => 
          this.createChatCompletionStreamWithWebSearch(request, options),
        createWithFiles: (
          request: Omit<ChatCompletionRequest, 'messages'> & { messages: ChatMessage[] },
          files: FileMessage[],
          options?: FileUploadOptions
        ) => this.createChatCompletionWithFiles(request, files, options),
        streamWithFiles: (
          request: Omit<ChatCompletionRequest, 'messages'> & { messages: ChatMessage[] },
          files: FileMessage[],
          streamOptions?: StreamOptions,
          fileOptions?: FileUploadOptions
        ) => this.createChatCompletionStreamWithFiles(request, files, streamOptions, fileOptions),
      },
    };
  }

  get models() {
    return {
      list: () => this.listModels(),
    };
  }

  get files() {
    return {
      createMessages: (files: FileMessage[], options?: FileUploadOptions) => 
        this.createFileMessages(files, options),
      readContent: EasyLLM.readFileContent,
    };
  }

  get images() {
    return {
      generate: (request: ImageGenerationRequest) => this.createImage(request),
    };
  }

  get moderations() {
    return {
      create: (request: ModerationRequest) => this.createModeration(request),
    };
  }
}