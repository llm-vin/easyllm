import axios from 'axios';
import { EasyLLM } from '../client';
import { ChatCompletionRequest, ChatCompletionResponse } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EasyLLM', () => {
  let client: EasyLLM;
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
    
    client = new EasyLLM({
      apiKey: 'test-api-key',
    });
  });

  describe('constructor', () => {
    it('should create client with default llm.vin configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.llm.vin/v1',
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should create client with OpenAI configuration', () => {
      new EasyLLM({
        apiKey: 'test-api-key',
        provider: 'openai',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.openai.com/v1',
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should create client with custom configuration', () => {
      new EasyLLM({
        apiKey: 'test-api-key',
        baseURL: 'https://custom-api.com/v1',
        provider: 'custom',
        timeout: 60000,
        maxRetries: 5,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom-api.com/v1',
        timeout: 60000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('createChatCompletion', () => {
    it('should create chat completion successfully', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello! How can I help you?' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 9,
          total_tokens: 19,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should work with chat.completions.create syntax', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.chat.completions.create(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('listModels', () => {
    it('should list models successfully', async () => {
      const mockResponse = {
        object: 'list',
        data: [
          {
            id: 'llama4-scout',
            object: 'model',
            created: 1677610602,
            owned_by: 'llm.vin',
          },
          {
            id: 'gpt-4',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await client.listModels();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models');
      expect(result).toEqual(mockResponse);
    });

    it('should work with models.list syntax', async () => {
      const mockResponse = {
        object: 'list',
        data: [],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await client.models.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createImage', () => {
    it('should generate image successfully', async () => {
      const mockRequest = {
        prompt: 'A beautiful sunset',
        n: 1,
        size: '1024x1024' as const,
      };

      const mockResponse = {
        created: 1677652288,
        data: [
          {
            url: 'https://example.com/image.png',
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createImage(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/images/generations', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should work with images.generate syntax', async () => {
      const mockRequest = {
        prompt: 'A cat',
        n: 1,
        size: '512x512' as const,
      };

      const mockResponse = {
        created: 1677652288,
        data: [{ url: 'https://example.com/cat.png' }],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.images.generate(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/images/generations', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createModeration', () => {
    it('should moderate content successfully', async () => {
      const mockRequest = {
        input: 'This is some text to moderate',
      };

      const mockResponse = {
        id: 'modr-123',
        model: 'moderation-1',
        results: [
          {
            flagged: false,
            categories: {
              sexual: false,
              hate: false,
              harassment: false,
              'self-harm': false,
              violence: false,
            },
            category_scores: {
              sexual: 0.1,
              hate: 0.05,
              harassment: 0.1,
              'self-harm': 0.05,
              violence: 0.1,
            },
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createModeration(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/moderations', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should moderate multiple inputs', async () => {
      const mockRequest = {
        input: ['Text 1', 'Text 2'],
        model: 'moderation-1',
      };

      const mockResponse = {
        id: 'modr-456',
        model: 'moderation-1',
        results: [
          {
            flagged: false,
            categories: {
              sexual: false,
              hate: false,
              harassment: false,
              'self-harm': false,
              violence: false,
            },
            category_scores: {
              sexual: 0.1,
              hate: 0.05,
              harassment: 0.1,
              'self-harm': 0.05,
              violence: 0.1,
            },
          },
          {
            flagged: true,
            categories: {
              sexual: false,
              hate: true,
              harassment: false,
              'self-harm': false,
              violence: false,
            },
            category_scores: {
              sexual: 0.1,
              hate: 0.9,
              harassment: 0.2,
              'self-harm': 0.05,
              violence: 0.2,
            },
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createModeration(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/moderations', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should moderate with images', async () => {
      const mockRequest = {
        input: 'Text with image',
        model: 'moderation-1',
        input_images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'],
      };

      const mockResponse = {
        id: 'modr-789',
        model: 'moderation-1',
        results: [
          {
            flagged: false,
            categories: {
              sexual: false,
              hate: false,
              harassment: false,
              'self-harm': false,
              violence: false,
            },
            category_scores: {
              sexual: 0.2,
              hate: 0.1,
              harassment: 0.15,
              'self-harm': 0.05,
              violence: 0.1,
            },
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createModeration(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/moderations', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should work with moderations.create syntax', async () => {
      const mockRequest = {
        input: 'Test moderation',
      };

      const mockResponse = {
        id: 'modr-321',
        model: 'moderation-1',
        results: [
          {
            flagged: false,
            categories: {
              sexual: false,
              hate: false,
              harassment: false,
              'self-harm': false,
              violence: false,
            },
            category_scores: {
              sexual: 0.1,
              hate: 0.05,
              harassment: 0.1,
              'self-harm': 0.05,
              violence: 0.1,
            },
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.moderations.create(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/moderations', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should throw error on API failure', async () => {
      const error = new Error('API Error');
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(
        client.createChatCompletion({
          model: 'llama4-scout',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('API Error');
    });
  });
});