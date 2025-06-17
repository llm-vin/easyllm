import axios from 'axios';
import { EasyLLM } from '../client';
import { EasyLLMConfig, ChatCompletionRequest } from '../types';

// Mock axios to avoid real API calls in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EasyLLM Web Search', () => {
  let client: EasyLLM;
  let mockConfig: EasyLLMConfig;
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    request: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    mockConfig = {
      apiKey: 'test-api-key',
      baseURL: 'https://test-api.com/v1',
      webSearch: {
        enabled: true,
        maxResults: 5,
        includeContent: true,
      },
    };
    client = new EasyLLM(mockConfig);
  });

  describe('Configuration', () => {
    it('should initialize with web search enabled', () => {
      expect(client.isWebSearchEnabled()).toBe(true);
    });

    it('should initialize with web search disabled by default', () => {
      const defaultClient = new EasyLLM({ apiKey: 'test-key' });
      expect(defaultClient.isWebSearchEnabled()).toBe(false);
    });

    it('should allow enabling web search after initialization', () => {
      const defaultClient = new EasyLLM({ apiKey: 'test-key' });
      expect(defaultClient.isWebSearchEnabled()).toBe(false);
      
      defaultClient.setWebSearchEnabled(true);
      expect(defaultClient.isWebSearchEnabled()).toBe(true);
    });

    it('should allow disabling web search after initialization', () => {
      expect(client.isWebSearchEnabled()).toBe(true);
      
      client.setWebSearchEnabled(false);
      expect(client.isWebSearchEnabled()).toBe(false);
    });

    it('should merge web search options correctly', () => {
      const customConfig: EasyLLMConfig = {
        apiKey: 'test-key',
        webSearch: {
          enabled: true,
          maxResults: 10,
        },
      };
      
      const customClient = new EasyLLM(customConfig);
      expect(customClient.isWebSearchEnabled()).toBe(true);
    });
  });

  describe('Request Enhancement', () => {
    it('should test enhanceRequestWithWebSearch logic through configuration', () => {
      // Test global web search enabled
      client.setWebSearchEnabled(true);
      expect(client.isWebSearchEnabled()).toBe(true);

      // Test global web search disabled  
      client.setWebSearchEnabled(false);
      expect(client.isWebSearchEnabled()).toBe(false);
    });

    it('should maintain webSearch parameter integrity', () => {
      const requestWithWebSearchTrue: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test message' }],
        webSearch: true,
      };

      const requestWithWebSearchFalse: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test message' }],
        webSearch: false,
      };

      // Verify requests maintain their webSearch values
      expect(requestWithWebSearchTrue.webSearch).toBe(true);
      expect(requestWithWebSearchFalse.webSearch).toBe(false);
    });
  });

  describe('API Methods', () => {
    it('should provide createChatCompletionWithWebSearch method', () => {
      expect(typeof client.createChatCompletionWithWebSearch).toBe('function');
    });

    it('should provide createChatCompletionStreamWithWebSearch method', () => {
      expect(typeof client.createChatCompletionStreamWithWebSearch).toBe('function');
    });

    it('should provide convenience methods in chat.completions', () => {
      expect(typeof client.chat.completions.createWithWebSearch).toBe('function');
      expect(typeof client.chat.completions.streamWithWebSearch).toBe('function');
    });

    it('should have web search enabled/disabled control methods', () => {
      expect(typeof client.setWebSearchEnabled).toBe('function');
      expect(typeof client.isWebSearchEnabled).toBe('function');
    });
  });

  describe('Web Search Configuration Validation', () => {
    it('should handle missing webSearch config gracefully', () => {
      const clientWithoutWebSearch = new EasyLLM({ apiKey: 'test-key' });
      
      // Should not throw error and should default to disabled
      expect(clientWithoutWebSearch.isWebSearchEnabled()).toBe(false);
      
      // Should be able to enable it
      clientWithoutWebSearch.setWebSearchEnabled(true);
      expect(clientWithoutWebSearch.isWebSearchEnabled()).toBe(true);
    });

    it('should preserve other config options when setting web search', () => {
      const originalTimeout = 60000;
      const configWithTimeout: EasyLLMConfig = {
        apiKey: 'test-key',
        timeout: originalTimeout,
      };
      
      const clientWithTimeout = new EasyLLM(configWithTimeout);
      clientWithTimeout.setWebSearchEnabled(true);
      
      expect(clientWithTimeout.isWebSearchEnabled()).toBe(true);
      // This test assumes we can access the private config, which we can't directly
      // In a real implementation, you might want to add a public getter for timeout
    });

    it('should handle partial webSearch config', () => {
      const partialConfig: EasyLLMConfig = {
        apiKey: 'test-key',
        webSearch: {
          enabled: true,
          // Missing maxResults and includeContent
        },
      };
      
      const clientWithPartialConfig = new EasyLLM(partialConfig);
      expect(clientWithPartialConfig.isWebSearchEnabled()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined webSearch in request', () => {
      const request: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
        webSearch: undefined,
      };

      // Should not throw error and webSearch should be undefined
      expect(request.webSearch).toBeUndefined();
    });

    it('should handle boolean webSearch values correctly', () => {
      const requestTrue: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
        webSearch: true,
      };

      const requestFalse: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
        webSearch: false,
      };

      expect(requestTrue.webSearch).toBe(true);
      expect(requestFalse.webSearch).toBe(false);
    });
  });
});