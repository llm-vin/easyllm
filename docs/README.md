# EasyLLM SDK

A unified TypeScript/JavaScript SDK for OpenAI-compatible LLM APIs, including llm.vin and OpenAI.

## Installation

```bash
npm install easyllm
```

## Quick Start

```typescript
import EasyLLM from 'easyllm';

// Using llm.vin (default)
const client = new EasyLLM({
  apiKey: 'your-llm-vin-api-key'
});

// Using OpenAI
const openaiClient = new EasyLLM({
  apiKey: 'your-openai-api-key',
  provider: 'openai'
});

// Chat completion
const response = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
});

console.log(response.choices[0].message.content);
```

## Configuration

```typescript
const client = new EasyLLM({
  apiKey: 'your-api-key',
  baseURL: 'https://api.llm.vin/v1', // Optional, defaults based on provider
  provider: 'llm.vin', // 'llm.vin', 'openai', or 'custom'
  timeout: 30000, // Request timeout in ms
  maxRetries: 3 // Max retry attempts for failed requests
});
```

## API Reference

### Chat Completions

#### Regular (Non-streaming)
```typescript
const response = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  max_tokens: 150
});
```

#### Streaming
```typescript
// Method 1: Using stream: true
const stream = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}

// Method 2: Using dedicated stream method
const stream = await client.chat.completions.stream({
  model: 'llama4-scout',
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}

// Method 3: With callbacks
const stream = await client.chat.completions.stream({
  model: 'llama4-scout',
  messages: [{ role: 'user', content: 'Tell me a story' }]
}, {
  onProgress: (chunk) => {
    const content = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(content);
  },
  onComplete: () => {
    console.log('\n\nStream completed!');
  },
  onError: (error) => {
    console.error('Stream error:', error);
  }
});
```

### Function Calling

#### Basic Function Definition
```typescript
const tools = [
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

const response = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'What is the weather like in San Francisco?' }
  ],
  tools,
  tool_choice: 'auto'
});

// Check if the model wants to call a function
if (response.choices[0].finish_reason === 'tool_calls') {
  const toolCalls = response.choices[0].message.tool_calls;
  console.log('Function to call:', toolCalls[0].function.name);
  console.log('Arguments:', toolCalls[0].function.arguments);
}
```

#### Function Calling with Streaming
```typescript
const stream = await client.chat.completions.stream({
  model: 'llama4-scout',
  messages: [{ role: 'user', content: 'Get the weather in Tokyo' }],
  tools
}, {
  onProgress: (chunk) => {
    if (chunk.choices[0].delta.tool_calls) {
      console.log('Tool call chunk:', chunk.choices[0].delta.tool_calls);
    }
  }
});

for await (const chunk of stream) {
  if (chunk.choices[0].finish_reason === 'tool_calls') {
    console.log('Function call completed');
  }
}
```

#### Complete Function Calling Flow
```typescript
// Step 1: Initial request with function definitions
const weatherTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' }
      },
      required: ['location']
    }
  }
};

const messages = [
  { role: 'user', content: 'What\'s the weather in Paris?' }
];

const response1 = await client.chat.completions.create({
  model: 'llama4-scout',
  messages,
  tools: [weatherTool]
});

// Step 2: Handle function call
if (response1.choices[0].finish_reason === 'tool_calls') {
  const toolCall = response1.choices[0].message.tool_calls[0];
  
  // Add assistant's function call to conversation
  messages.push(response1.choices[0].message);
  
  // Execute the function (your implementation)
  const weatherData = await getWeather(
    JSON.parse(toolCall.function.arguments).location
  );
  
  // Add function result to conversation
  messages.push({
    role: 'tool',
    content: JSON.stringify(weatherData),
    tool_call_id: toolCall.id
  });
  
  // Step 3: Get final response
  const response2 = await client.chat.completions.create({
    model: 'llama4-scout',
    messages
  });
  
  console.log(response2.choices[0].message.content);
}
```

### List Models

```typescript
const models = await client.models.list();
console.log(models.data);
```

### Image Generation

```typescript
const image = await client.images.generate({
  prompt: 'A beautiful sunset over the ocean',
  n: 1,
  size: '1024x1024'
});
```

### Content Moderation

#### Basic Text Moderation
```typescript
const moderation = await client.moderations.create({
  input: 'Text to moderate'
});

console.log('Flagged:', moderation.results[0].flagged);
console.log('Categories:', moderation.results[0].categories);
console.log('Scores:', moderation.results[0].category_scores);
```

#### Batch Text Moderation
```typescript
const moderation = await client.moderations.create({
  input: [
    'First text to check',
    'Second text to check',
    'Third text to check'
  ],
  model: 'moderation-1'
});

moderation.results.forEach((result, index) => {
  console.log(`Text ${index + 1}: ${result.flagged ? 'FLAGGED' : 'SAFE'}`);
});
```

#### Text and Image Moderation
```typescript
const moderation = await client.moderations.create({
  input: 'Check this text and images',
  model: 'moderation-1',
  input_images: [
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  ]
});

const result = moderation.results[0];
if (result.flagged) {
  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);
  console.log('Flagged for:', flaggedCategories.join(', '));
}
```

#### Moderation Categories
The moderation endpoint checks for these categories:
- `sexual`: Sexual content
- `hate`: Hate speech
- `harassment`: Harassment
- `self-harm`: Self-harm content
- `violence`: Violence

Each category returns:
- A boolean flag indicating if content violates the policy
- A confidence score between 0 and 1

### File Upload

Send file contents to AI models using the `file` role. Files are automatically formatted with XML tags for better AI parsing.

#### Basic File Upload

```typescript
const files = [
  {
    fileName: 'main.py',
    content: 'print("hello world")'
  }
];

const response = await client.chat.completions.createWithFiles({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'What does this Python script do?' }
  ]
}, files);

console.log(response.choices[0].message.content);
```

#### Multiple File Upload

```typescript
const files = [
  {
    fileName: 'config.json',
    content: '{"api_key": "secret", "debug": true}'
  },
  {
    fileName: 'app.py',
    content: 'import json\n\nwith open("config.json") as f:\n    config = json.load(f)'
  }
];

const response = await client.chat.completions.createWithFiles({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Review this code for security issues' }
  ]
}, files);
```

#### File Upload with Validation

```typescript
const files = [
  {
    fileName: 'test.py',
    content: 'print("hello")'
  }
];

const options = {
  maxFileSize: 1024 * 1024, // 1MB limit
  allowedExtensions: ['py', 'js', 'ts', 'txt']
};

const response = await client.chat.completions.createWithFiles({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Analyze this code' }
  ]
}, files, options);
```

#### Reading File Content from Different Sources

```typescript
// From string content
const fileFromString = await EasyLLM.readFileContent(
  'console.log("hello")',
  'script.js'
);

// From Buffer (Node.js)
const buffer = Buffer.from('print("hello")', 'utf-8');
const fileFromBuffer = await EasyLLM.readFileContent(buffer, 'script.py');

// From File object (Browser)
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const browserFile = fileInput.files[0];
const fileFromBrowser = await EasyLLM.readFileContent(browserFile);

// Use the files
const response = await client.chat.completions.createWithFiles({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Analyze these files' }
  ]
}, [fileFromString, fileFromBuffer, fileFromBrowser]);
```

#### Streaming with File Upload

```typescript
const files = [
  {
    fileName: 'data.csv',
    content: 'name,age\nJohn,30\nJane,25'
  }
];

const stream = await client.chat.completions.streamWithFiles({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Analyze this data and provide insights' }
  ]
}, files);

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

#### Using the Files Utility

```typescript
// Create file messages manually
const fileMessages = client.files.createMessages([
  { fileName: 'test.txt', content: 'Hello world' }
]);

// Add to regular chat completion
const response = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [
    ...fileMessages,
    { role: 'user', content: 'What does this file contain?' }
  ]
});
```

#### File Role Format

When you send files using the `file` role, they are automatically transformed for the AI:

Input:
```typescript
{ role: 'file', fileName: 'example.py', content: 'print("hello")' }
```

Transformed to:
```xml
<file fileName="example.py">
print("hello")
</file>
```

**File Upload Features:**
- Automatic XML formatting for better AI parsing
- File name validation (limited to 50 characters)
- Optional file size and extension validation
- Support for multiple files in one request
- Works with both regular and streaming completions

## Supported Providers

- **llm.vin** (default): Access to multiple AI models
- **OpenAI**: Official OpenAI API
- **Custom**: Any OpenAI-compatible API endpoint

## Error Handling

The SDK includes automatic retry logic for server errors (5xx) and proper error handling:

```typescript
try {
  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  console.error('API Error:', error.message);
}
```