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

## Function Calling Examples

### Weather Function
```typescript
import EasyLLM from 'easyllm';

const client = new EasyLLM({
  apiKey: process.env.LLM_VIN_API_KEY!
});

// Mock weather function
async function getWeather(location: string, unit: string = 'fahrenheit') {
  // In a real app, this would call a weather API
  return {
    location,
    temperature: unit === 'celsius' ? 22 : 72,
    condition: 'sunny',
    unit
  };
}

async function weatherExample() {
  const weatherTool = {
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
  };

  const messages = [
    { role: 'user', content: 'What\'s the weather like in Tokyo?' }
  ];

  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages,
    tools: [weatherTool],
    tool_choice: 'auto'
  });

  if (response.choices[0].finish_reason === 'tool_calls') {
    const toolCall = response.choices[0].message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    
    console.log(`Calling ${toolCall.function.name} with:`, args);
    
    // Execute the function
    const weatherData = await getWeather(args.location, args.unit);
    
    // Add function call and result to conversation
    messages.push(response.choices[0].message);
    messages.push({
      role: 'tool',
      content: JSON.stringify(weatherData),
      tool_call_id: toolCall.id
    });
    
    // Get final response
    const finalResponse = await client.chat.completions.create({
      model: 'llama4-scout',
      messages
    });
    
    console.log('Final response:', finalResponse.choices[0].message.content);
  }
}
```

### Calculator Function
```typescript
async function calculatorExample() {
  const calculatorTool = {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")'
          }
        },
        required: ['expression']
      }
    }
  };

  function calculate(expression: string) {
    try {
      // Simple eval for demo - use a proper math parser in production
      const result = eval(expression.replace(/sqrt/g, 'Math.sqrt'));
      return { result, expression };
    } catch (error) {
      return { error: 'Invalid expression', expression };
    }
  }

  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'What is 15 * 24 + sqrt(144)?' }
    ],
    tools: [calculatorTool]
  });

  if (response.choices[0].finish_reason === 'tool_calls') {
    const toolCall = response.choices[0].message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    
    const result = calculate(args.expression);
    console.log('Calculation result:', result);
  }
}
```

### Multiple Functions
```typescript
async function multipleFunctionsExample() {
  const tools = [
    {
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
    },
    {
      type: 'function',
      function: {
        name: 'get_time',
        description: 'Get current time in a timezone',
        parameters: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone (e.g., America/New_York, Europe/London)'
            }
          },
          required: ['timezone']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Search the web for information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      }
    }
  ];

  const response = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'I need the weather in London, current time there, and search for London tourism info' }
    ],
    tools
  });

  if (response.choices[0].finish_reason === 'tool_calls') {
    const toolCalls = response.choices[0].message.tool_calls;
    console.log(`Model wants to call ${toolCalls.length} functions:`);
    
    toolCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.function.name}:`, 
                  JSON.parse(call.function.arguments));
    });
  }
}
```

### Streaming Function Calls
```typescript
async function streamingFunctionCalls() {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'analyze_data',
        description: 'Analyze a dataset',
        parameters: {
          type: 'object',
          properties: {
            data_type: {
              type: 'string',
              enum: ['sales', 'marketing', 'financial'],
              description: 'Type of data to analyze'
            },
            time_period: {
              type: 'string',
              description: 'Time period for analysis'
            }
          },
          required: ['data_type', 'time_period']
        }
      }
    }
  ];

  let toolCallArgs = '';
  let toolCallName = '';

  const stream = await client.chat.completions.stream({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'Analyze our sales data for the last quarter' }
    ],
    tools
  }, {
    onProgress: (chunk) => {
      if (chunk.choices[0].delta.tool_calls) {
        const toolCall = chunk.choices[0].delta.tool_calls[0];
        if (toolCall.function?.name) {
          toolCallName = toolCall.function.name;
          console.log(`Starting function call: ${toolCallName}`);
        }
        if (toolCall.function?.arguments) {
          toolCallArgs += toolCall.function.arguments;
          process.stdout.write(toolCall.function.arguments);
        }
      }
    },
    onComplete: () => {
      if (toolCallArgs) {
        console.log(`\nComplete arguments for ${toolCallName}:`, 
                    JSON.parse(toolCallArgs));
      }
    }
  });

  for await (const chunk of stream) {
    if (chunk.choices[0].finish_reason === 'tool_calls') {
      console.log('\nFunction calling completed');
    }
  }
}
```

### Function Choice Control
```typescript
async function functionChoiceExample() {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Send an email',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body' }
          },
          required: ['to', 'subject', 'body']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'schedule_meeting',
        description: 'Schedule a meeting',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Meeting title' },
            time: { type: 'string', description: 'Meeting time' }
          },
          required: ['title', 'time']
        }
      }
    }
  ];

  // Force the model to use a specific function
  const response1 = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'I need to contact John about the project' }
    ],
    tools,
    tool_choice: {
      type: 'function',
      function: { name: 'send_email' }
    }
  });

  console.log('Forced email function:', response1.choices[0].message.tool_calls);

  // Prevent function calling
  const response2 = await client.chat.completions.create({
    model: 'llama4-scout',
    messages: [
      { role: 'user', content: 'I need to contact John about the project' }
    ],
    tools,
    tool_choice: 'none'
  });

  console.log('No function call:', response2.choices[0].message.content);
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