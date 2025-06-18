import axios from 'axios';
import { EasyLLM } from '../client';
import { FileMessage, FileUploadOptions, ChatMessage } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EasyLLM File Upload', () => {
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

  describe('createFileMessages', () => {
    it('should create file role messages from file data', () => {
      const files: FileMessage[] = [
        {
          fileName: 'test.py',
          content: 'print("hello world")',
        },
        {
          fileName: 'config.json',
          content: '{"debug": true}',
        },
      ];

      const fileMessages = client.createFileMessages(files);

      expect(fileMessages).toHaveLength(2);
      expect(fileMessages[0]).toEqual({
        role: 'file',
        content: 'print("hello world")',
        fileName: 'test.py',
      });
      expect(fileMessages[1]).toEqual({
        role: 'file',
        content: '{"debug": true}',
        fileName: 'config.json',
      });
    });

    it('should truncate long file names to 50 characters', () => {
      const files: FileMessage[] = [
        {
          fileName: 'this_is_a_very_long_filename_that_should_be_truncated_to_fifty_characters.py',
          content: 'print("test")',
        },
      ];

      const fileMessages = client.createFileMessages(files);

      expect(fileMessages[0].fileName).toHaveLength(50);
      expect(fileMessages[0].fileName).toBe('this_is_a_very_long_filename_that_should_be_trunca');
    });

    it('should validate file size when maxFileSize is specified', () => {
      const files: FileMessage[] = [
        {
          fileName: 'large-file.txt',
          content: 'x'.repeat(1000),
        },
      ];

      const options: FileUploadOptions = {
        maxFileSize: 500,
      };

      expect(() => {
        client.createFileMessages(files, options);
      }).toThrow('File large-file.txt exceeds maximum size of 500 bytes');
    });

    it('should validate file extensions when allowedExtensions is specified', () => {
      const files: FileMessage[] = [
        {
          fileName: 'test.exe',
          content: 'binary content',
        },
      ];

      const options: FileUploadOptions = {
        allowedExtensions: ['txt', 'py', 'js'],
      };

      expect(() => {
        client.createFileMessages(files, options);
      }).toThrow('File test.exe has unsupported extension. Allowed: txt, py, js');
    });

    it('should allow files with supported extensions', () => {
      const files: FileMessage[] = [
        {
          fileName: 'test.py',
          content: 'print("hello")',
        },
      ];

      const options: FileUploadOptions = {
        allowedExtensions: ['txt', 'py', 'js'],
      };

      const fileMessages = client.createFileMessages(files, options);

      expect(fileMessages).toHaveLength(1);
      expect(fileMessages[0].fileName).toBe('test.py');
    });
  });

  describe('createChatCompletionWithFiles', () => {
    it('should create chat completion with file messages', async () => {
      const mockResponse = {
        data: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'llama4-scout',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This Python script prints "hello world" to the console.',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 25,
            completion_tokens: 12,
            total_tokens: 37,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const files: FileMessage[] = [
        {
          fileName: 'main.py',
          content: 'print("hello world")',
        },
      ];

      const request = {
        model: 'llama4-scout',
        messages: [
          { role: 'user' as const, content: 'What does this script do?' },
        ],
      };

      const response = await client.createChatCompletionWithFiles(request, files);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'llama4-scout',
        messages: [
          { role: 'file', content: 'print("hello world")', fileName: 'main.py' },
          { role: 'user', content: 'What does this script do?' },
        ],
      });

      expect(response).toEqual(mockResponse.data);
    });

    it('should handle multiple files', async () => {
      const mockResponse = {
        data: {
          id: 'chatcmpl-124',
          object: 'chat.completion',
          created: 1677652289,
          model: 'llama4-scout',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This code loads configuration from a JSON file.',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 45,
            completion_tokens: 10,
            total_tokens: 55,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const files: FileMessage[] = [
        {
          fileName: 'config.json',
          content: '{"api_key": "secret", "debug": true}',
        },
        {
          fileName: 'app.py',
          content: 'import json\n\nwith open("config.json") as f:\n    config = json.load(f)',
        },
      ];

      const request = {
        model: 'llama4-scout',
        messages: [
          { role: 'user' as const, content: 'Review this code for security issues' },
        ],
      };

      const response = await client.createChatCompletionWithFiles(request, files);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'llama4-scout',
        messages: [
          { role: 'file', content: '{"api_key": "secret", "debug": true}', fileName: 'config.json' },
          { role: 'file', content: 'import json\n\nwith open("config.json") as f:\n    config = json.load(f)', fileName: 'app.py' },
          { role: 'user', content: 'Review this code for security issues' },
        ],
      });

      expect(response).toEqual(mockResponse.data);
    });
  });

  describe('readFileContent', () => {
    it('should handle string content', async () => {
      const content = 'Hello, world!';
      const result = await EasyLLM.readFileContent(content, 'test.txt');

      expect(result).toEqual({
        fileName: 'test.txt',
        content: 'Hello, world!',
      });
    });

    it('should handle Buffer content', async () => {
      const buffer = Buffer.from('Hello, world!', 'utf-8');
      const result = await EasyLLM.readFileContent(buffer, 'test.txt');

      expect(result).toEqual({
        fileName: 'test.txt',
        content: 'Hello, world!',
      });
    });

    it('should use default filename when not provided', async () => {
      const content = 'Hello, world!';
      const result = await EasyLLM.readFileContent(content);

      expect(result).toEqual({
        fileName: 'untitled.txt',
        content: 'Hello, world!',
      });
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = 123 as any;

      await expect(EasyLLM.readFileContent(unsupportedFile)).rejects.toThrow(
        'Unsupported file type. Expected string, Buffer, or File object.'
      );
    });
  });

  describe('chat.completions.createWithFiles', () => {
    it('should provide file upload through chat getter', async () => {
      const mockResponse = {
        data: {
          id: 'chatcmpl-125',
          object: 'chat.completion',
          created: 1677652290,
          model: 'llama4-scout',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'File analyzed successfully.',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 5,
            total_tokens: 25,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const files: FileMessage[] = [
        {
          fileName: 'test.txt',
          content: 'Test content',
        },
      ];

      const request = {
        model: 'llama4-scout',
        messages: [
          { role: 'user' as const, content: 'Analyze this file' },
        ],
      };

      const response = await client.chat.completions.createWithFiles(request, files);

      expect(response).toEqual(mockResponse.data);
    });
  });

  describe('files getter', () => {
    it('should provide access to file utilities', () => {
      const files: FileMessage[] = [
        {
          fileName: 'test.py',
          content: 'print("hello")',
        },
      ];

      const fileMessages = client.files.createMessages(files);

      expect(fileMessages).toHaveLength(1);
      expect(fileMessages[0]).toEqual({
        role: 'file',
        content: 'print("hello")',
        fileName: 'test.py',
      });

      expect(client.files.readContent).toBe(EasyLLM.readFileContent);
    });
  });
});