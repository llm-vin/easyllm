import { EasyLLM } from '../client';
import { ChatCompletionRequest, ChatCompletionChunk } from '../types';

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EasyLLM Streaming', () => {
  let client: EasyLLM;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new EasyLLM({
      apiKey: 'test-api-key',
    });
  });

  describe('createChatCompletionStream', () => {
    it('should stream chat completion chunks', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const mockChunks = [
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"content":" there!"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[1]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[2]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[3]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[4]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
        text: jest.fn(),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const stream = await client.createChatCompletionStream(mockRequest);
      const chunks: ChatCompletionChunk[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith('https://api.llm.vin/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(mockRequest),
        signal: undefined,
      });

      expect(chunks).toHaveLength(4);
      expect(chunks[0].choices[0].delta.role).toBe('assistant');
      expect(chunks[1].choices[0].delta.content).toBe('Hello');
      expect(chunks[2].choices[0].delta.content).toBe(' there!');
      expect(chunks[3].choices[0].finish_reason).toBe('stop');
    });

    it('should handle streaming with callbacks', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const onProgress = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      const mockChunk = 'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n';

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunk) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const stream = await client.createChatCompletionStream(mockRequest, {
        onProgress,
        onComplete,
        onError,
      });

      const chunks: ChatCompletionChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(chunks).toHaveLength(1);
    });

    it('should handle streaming errors', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const onError = jest.fn();

      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const stream = await client.createChatCompletionStream(mockRequest, { onError });
      
      await expect(async () => {
        for await (const chunk of stream) {
          // This should throw
        }
      }).rejects.toThrow('HTTP 401: Unauthorized');

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should support AbortSignal', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const controller = new AbortController();
      const signal = controller.signal;

      mockFetch.mockRejectedValue(new Error('Request aborted'));

      const stream = await client.createChatCompletionStream(mockRequest, { signal });
      
      await expect(async () => {
        for await (const chunk of stream) {
          // This should throw
        }
      }).rejects.toThrow('Request aborted');

      expect(mockFetch).toHaveBeenCalledWith('https://api.llm.vin/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(mockRequest),
        signal,
      });
    });
  });

  describe('chat.completions.create with stream', () => {
    it('should automatically use streaming when stream=true', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const mockChunk = 'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n';

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunk) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const stream = await client.chat.completions.create(mockRequest);
      
      // Should return an async generator
      expect(typeof (stream as any)[Symbol.asyncIterator]).toBe('function');
    });
  });

  describe('chat.completions.stream', () => {
    it('should provide dedicated streaming method', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const mockChunk = 'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n';

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunk) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const stream = await client.chat.completions.stream(mockRequest);
      const chunks: ChatCompletionChunk[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
    });
  });
});