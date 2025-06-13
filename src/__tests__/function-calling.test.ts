import { EasyLLM } from '../client';
import { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionChunk,
  Tool,
  ToolCall 
} from '../types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EasyLLM Function Calling', () => {
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

  describe('function definitions', () => {
    it('should handle chat completion with function definitions', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the current weather for a location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'The city and state, e.g. San Francisco, CA'
                },
                unit: {
                  type: 'string',
                  enum: ['celsius', 'fahrenheit'],
                  description: 'The temperature unit'
                }
              },
              required: ['location']
            }
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [
          { role: 'user', content: 'What is the weather like in San Francisco?' }
        ],
        tools,
        tool_choice: 'auto'
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location": "San Francisco, CA", "unit": "fahrenheit"}'
              }
            }]
          },
          finish_reason: 'tool_calls',
        }],
        usage: {
          prompt_tokens: 45,
          completion_tokens: 15,
          total_tokens: 60,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(result.choices[0].message.tool_calls).toHaveLength(1);
      expect(result.choices[0].message.tool_calls![0].function.name).toBe('get_weather');
      expect(result.choices[0].finish_reason).toBe('tool_calls');
    });

    it('should handle specific tool choice', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'calculate',
            description: 'Perform mathematical calculations',
            parameters: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: 'Mathematical expression to evaluate'
                }
              },
              required: ['expression']
            }
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [
          { role: 'user', content: 'Calculate 15 * 24' }
        ],
        tools,
        tool_choice: {
          type: 'function',
          function: { name: 'calculate' }
        }
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-124',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_124',
              type: 'function',
              function: {
                name: 'calculate',
                arguments: '{"expression": "15 * 24"}'
              }
            }]
          },
          finish_reason: 'tool_calls',
        }],
        usage: {
          prompt_tokens: 35,
          completion_tokens: 12,
          total_tokens: 47,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);
      
      expect(result.choices[0].message.tool_calls![0].function.name).toBe('calculate');
      expect(JSON.parse(result.choices[0].message.tool_calls![0].function.arguments)).toEqual({
        expression: '15 * 24'
      });
    });

    it('should handle tool response messages', async () => {
      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [
          { role: 'user', content: 'What is the weather like in San Francisco?' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location": "San Francisco, CA"}'
              }
            }]
          },
          {
            role: 'tool',
            content: 'The weather in San Francisco, CA is currently 72°F and sunny.',
            tool_call_id: 'call_123'
          }
        ]
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-125',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'The weather in San Francisco is currently 72°F and sunny. It\'s a beautiful day!',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 85,
          completion_tokens: 18,
          total_tokens: 103,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);
      
      expect(result.choices[0].message.content).toContain('72°F and sunny');
      expect(result.choices[0].finish_reason).toBe('stop');
    });

    it('should work with chat.completions.create syntax', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'search_web',
            description: 'Search the web for information',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                }
              },
              required: ['query']
            }
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Search for latest AI news' }],
        tools,
        tool_choice: 'auto'
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-126',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_126',
              type: 'function',
              function: {
                name: 'search_web',
                arguments: '{"query": "latest AI news 2024"}'
              }
            }]
          },
          finish_reason: 'tool_calls',
        }],
        usage: {
          prompt_tokens: 32,
          completion_tokens: 10,
          total_tokens: 42,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.chat.completions.create(mockRequest) as ChatCompletionResponse;
      
      expect(result.choices[0].message.tool_calls).toHaveLength(1);
      expect(result.choices[0].message.tool_calls![0].function.name).toBe('search_web');
    });
  });

  describe('streaming with function calling', () => {
    it('should stream function calls', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'get_time',
            description: 'Get the current time',
            parameters: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                  description: 'Timezone (e.g., America/New_York)'
                }
              }
            }
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'What time is it in New York?' }],
        tools,
        stream: true
      };

      const mockChunks = [
        'data: {"id":"chatcmpl-127","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-127","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_127","type":"function","function":{"name":"get_time","arguments":""}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-127","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"tool_calls":[{"function":{"arguments":"{\\"timezone\\""}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-127","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"tool_calls":[{"function":{"arguments":": \\"America/New_York\\"}"}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-127","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[1]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[2]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[3]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[4]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[5]) })
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

      const stream = await client.createChatCompletionStream(mockRequest);
      const chunks: ChatCompletionChunk[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(5);
      expect(chunks[0].choices[0].delta.role).toBe('assistant');
      expect(chunks[1].choices[0].delta.tool_calls).toBeDefined();
      expect(chunks[1].choices[0].delta.tool_calls![0].function.name).toBe('get_time');
      expect(chunks[4].choices[0].finish_reason).toBe('tool_calls');
    });

    it('should work with chat.completions.stream for function calls', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'generate_image',
            description: 'Generate an image from a text prompt',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The image generation prompt'
                },
                style: {
                  type: 'string',
                  enum: ['realistic', 'cartoon', 'abstract'],
                  description: 'The image style'
                }
              },
              required: ['prompt']
            }
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Create a realistic image of a sunset' }],
        tools
      };

      const mockChunk = 'data: {"id":"chatcmpl-128","object":"chat.completion.chunk","created":1677652288,"model":"llama4-scout","choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_128","type":"function","function":{"name":"generate_image","arguments":"{\\"prompt\\": \\"realistic sunset\\", \\"style\\": \\"realistic\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n';

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
      expect(chunks[0].choices[0].delta.tool_calls).toBeDefined();
      expect(chunks[0].choices[0].delta.tool_calls![0].function.name).toBe('generate_image');
      expect(chunks[0].choices[0].finish_reason).toBe('tool_calls');
    });
  });

  describe('function calling edge cases', () => {
    it('should handle tool_choice: none', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather information'
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'Just tell me a joke, don\'t check the weather' }],
        tools,
        tool_choice: 'none'
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-129',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Why did the scarecrow win an award? Because he was outstanding in his field!'
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 28,
          completion_tokens: 17,
          total_tokens: 45,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);
      
      expect(result.choices[0].message.tool_calls).toBeUndefined();
      expect(result.choices[0].message.content).toContain('scarecrow');
      expect(result.choices[0].finish_reason).toBe('stop');
    });

    it('should handle multiple tool calls', async () => {
      const tools: Tool[] = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather information'
          }
        },
        {
          type: 'function',
          function: {
            name: 'get_time',
            description: 'Get current time'
          }
        }
      ];

      const mockRequest: ChatCompletionRequest = {
        model: 'llama4-scout',
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools
      };

      const mockResponse: ChatCompletionResponse = {
        id: 'chatcmpl-130',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama4-scout',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_130a',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"location": "New York, NY"}'
                }
              },
              {
                id: 'call_130b',
                type: 'function',
                function: {
                  name: 'get_time',
                  arguments: '{"timezone": "America/New_York"}'
                }
              }
            ]
          },
          finish_reason: 'tool_calls',
        }],
        usage: {
          prompt_tokens: 42,
          completion_tokens: 25,
          total_tokens: 67,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createChatCompletion(mockRequest);
      
      expect(result.choices[0].message.tool_calls).toHaveLength(2);
      expect(result.choices[0].message.tool_calls![0].function.name).toBe('get_weather');
      expect(result.choices[0].message.tool_calls![1].function.name).toBe('get_time');
    });
  });
});