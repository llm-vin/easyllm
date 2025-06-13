# Examples

## Basic Chat Completion

```typescript
import EasyLLM from 'easyllm';

const client = new EasyLLM({
  apiKey: process.env.LLM_VIN_API_KEY!
});

async function basicChat() {
  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ]
  });
  
  console.log(response.choices[0].message.content);
}

basicChat();
```

## Multi-turn Conversation

```typescript
async function conversation() {
  const messages = [
    { role: 'system', content: 'You are a helpful programming assistant.' },
    { role: 'user', content: 'How do I sort an array in JavaScript?' }
  ];

  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages,
    temperature: 0.7
  });

  messages.push(response.choices[0].message);
  messages.push({ role: 'user', content: 'Can you show me an example?' });

  const followUp = await client.chat.completions.create({
    model: 'llama4-scout',
    messages,
    temperature: 0.7
  });

  console.log(followUp.choices[0].message.content);
}

## Streaming Chat

```typescript
async function streamingChat() {
  const stream = await client.chat.completions.stream({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'Write a short story about a robot learning to paint' }
    ],
    temperature: 0.8,
    max_tokens: 500
  });

  let fullResponse = '';
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    process.stdout.write(content);
  }
  
  console.log('\n\nFull response received:', fullResponse.length, 'characters');
}

// Streaming with progress tracking
async function streamingWithProgress() {
  let tokenCount = 0;
  let startTime = Date.now();
  
  const stream = await client.chat.completions.stream({
    model: 'llama4-scout',
    messages: [{ role: 'user', content: 'Explain quantum computing in simple terms' }]
  }, {
    onProgress: (chunk) => {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        tokenCount++;
        process.stdout.write(content);
      }
    },
    onComplete: () => {
      const duration = Date.now() - startTime;
      console.log(`\n\nStreaming completed: ${tokenCount} tokens in ${duration}ms`);
    },
    onError: (error) => {
      console.error('\nStreaming error:', error.message);
    }
  });

  // You can still iterate if needed
  for await (const chunk of stream) {
    // Additional processing if needed
  }
}

// Cancellable streaming
async function cancellableStreaming() {
  const controller = new AbortController();
  
  // Cancel after 5 seconds
  setTimeout(() => controller.abort(), 5000);
  
  try {
    const stream = await client.chat.completions.stream({
      model: 'llama4-scout',
      messages: [{ role: 'user', content: 'Write a very long essay about the history of computers' }]
    }, {
      signal: controller.signal,
      onProgress: (chunk) => {
        const content = chunk.choices[0]?.delta?.content || '';
        process.stdout.write(content);
      }
    });

    for await (const chunk of stream) {
      // Process chunks
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('\nStream was cancelled');
    } else {
      console.error('\nStream error:', error);
    }
  }
}
```

## Using Different Providers

```typescript
// llm.vin
const llmVinClient = new EasyLLM({
  apiKey: process.env.LLM_VIN_API_KEY!,
  provider: 'llm.vin'
});

// OpenAI
const openaiClient = new EasyLLM({
  apiKey: process.env.OPENAI_API_KEY!,
  provider: 'openai'
});

// Custom provider
const customClient = new EasyLLM({
  apiKey: process.env.CUSTOM_API_KEY!,
  baseURL: 'https://your-custom-api.com/v1',
  provider: 'custom'
});
```

## Image Generation

```typescript
async function generateImage() {
  const response = await client.images.generate({
    prompt: 'A futuristic city skyline at sunset',
    n: 1,
    size: '1024x1024',
    response_format: 'url'
  });

  console.log('Generated image URL:', response.data[0].url);
}
```

## Content Moderation

```typescript
async function moderateContent() {
  const response = await client.moderations.create({
    input: 'This is some text to check for harmful content'
  });

  const result = response.results[0];
  console.log('Content flagged:', result.flagged);
  console.log('Categories:', result.categories);
}
```

## Error Handling with Retry

```typescript
async function robustApiCall() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY!,
    maxRetries: 5,
    timeout: 60000
  });

  try {
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages: [{ role: 'user', content: 'Hello!' }]
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Failed after retries:', error);
    throw error;
  }
}
```