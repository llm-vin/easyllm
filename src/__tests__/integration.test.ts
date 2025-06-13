import { EasyLLM } from '../client';

describe('EasyLLM Integration Tests', () => {
  const apiKey = process.env.LLM_VIN_API_KEY || process.env.TEST_API_KEY;
  
  // Skip integration tests if no API key is provided
  const testCondition = apiKey ? describe : describe.skip;

  testCondition('with real API', () => {
    let client: EasyLLM;

    beforeEach(() => {
      client = new EasyLLM({
        apiKey: apiKey!,
        timeout: 60000,
      });
    });

    it('should list models', async () => {
      const response = await client.models.list();
      
      expect(response).toHaveProperty('object', 'list');
      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        const model = response.data[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('object', 'model');
        expect(model).toHaveProperty('created');
        expect(model).toHaveProperty('owned_by');
      }
    }, 30000);

    it('should create chat completion', async () => {
      const response = await client.chat.completions.create({
        model: 'llama4-scout', // Use a model available on llm.vin
        messages: [
          { role: 'user', content: 'Say "Hello World" and nothing else.' }
        ],
        max_tokens: 10,
        temperature: 0,
        stream: false, // Explicitly set to false to ensure we get ChatCompletionResponse
      }) as any; // Type assertion to handle the union type

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('object', 'chat.completion');
      expect(response).toHaveProperty('created');
      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('choices');
      expect(response).toHaveProperty('usage');

      expect(Array.isArray(response.choices)).toBe(true);
      expect(response.choices.length).toBeGreaterThan(0);

      const choice = response.choices[0];
      expect(choice).toHaveProperty('index', 0);
      expect(choice).toHaveProperty('message');
      expect(choice).toHaveProperty('finish_reason');

      const message = choice.message;
      expect(message).toHaveProperty('role', 'assistant');
      expect(message).toHaveProperty('content');
      expect(typeof message.content).toBe('string');

      const usage = response.usage;
      expect(usage).toHaveProperty('prompt_tokens');
      expect(usage).toHaveProperty('completion_tokens');
      expect(usage).toHaveProperty('total_tokens');
      expect(typeof usage.prompt_tokens).toBe('number');
      expect(typeof usage.completion_tokens).toBe('number');
      expect(typeof usage.total_tokens).toBe('number');
    }, 30000);

    it('should handle different temperature settings', async () => {
      const responses = await Promise.all([
        client.chat.completions.create({
          model: 'llama4-scout',
          messages: [{ role: 'user', content: 'Generate a random number between 1 and 100.' }],
          temperature: 0,
          max_tokens: 20,
          stream: false,
        }),
        client.chat.completions.create({
          model: 'llama4-scout',
          messages: [{ role: 'user', content: 'Generate a random number between 1 and 100.' }],
          temperature: 1,
          max_tokens: 20,
          stream: false,
        }),
      ]);

      responses.forEach(response => {
        expect((response as any).choices[0].message.content).toBeTruthy();
      });
    }, 60000);
  });

  describe('error handling', () => {
    it('should handle invalid API key', async () => {
      const invalidClient = new EasyLLM({
        apiKey: 'invalid-key',
        timeout: 10000,
      });

      await expect(
        invalidClient.chat.completions.create({
          model: 'llama4-scout',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        })
      ).rejects.toThrow();
    }, 15000);

    it('should handle non-existent model', async () => {
      if (!apiKey) return;

      const client = new EasyLLM({
        apiKey,
        timeout: 10000,
      });

      await expect(
        client.chat.completions.create({
          model: 'non-existent-model-12345',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        })
      ).rejects.toThrow();
    }, 15000);
  });

  describe('OpenAI compatibility', () => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiTestCondition = openaiApiKey ? it : it.skip;

    openaiTestCondition('should work with OpenAI API', async () => {
      const openaiClient = new EasyLLM({
        apiKey: openaiApiKey!,
        provider: 'openai',
        timeout: 60000,
      });

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Say "OpenAI test successful" and nothing else.' }
        ],
        max_tokens: 10,
        temperature: 0,
        stream: false,
      });

      expect((response as any).choices[0].message.content).toContain('OpenAI test successful');
    }, 30000);
  });
});