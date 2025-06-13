const EasyLLM = require('../dist/index.js').default;

// Mock functions that would be implemented in a real application
const functions = {
  async get_weather(location, unit = 'fahrenheit') {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const temperatures = {
      'new york': { celsius: 15, fahrenheit: 59 },
      'london': { celsius: 12, fahrenheit: 54 },
      'tokyo': { celsius: 18, fahrenheit: 64 },
      'paris': { celsius: 16, fahrenheit: 61 },
      'sydney': { celsius: 22, fahrenheit: 72 }
    };
    
    const cityKey = location.toLowerCase().split(',')[0];
    const temp = temperatures[cityKey] || { celsius: 20, fahrenheit: 68 };
    
    return {
      location: location,
      temperature: temp[unit],
      unit: unit,
      condition: 'partly cloudy',
      humidity: 65,
      windSpeed: '10 mph'
    };
  },

  async calculate(expression) {
    try {
      // Simple calculator - in production use a proper math parser
      const safeExpression = expression
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/log/g, 'Math.log')
        .replace(/\^/g, '**');
      
      const result = eval(safeExpression);
      return {
        expression: expression,
        result: result,
        success: true
      };
    } catch (error) {
      return {
        expression: expression,
        error: 'Invalid mathematical expression',
        success: false
      };
    }
  },

  async search_web(query, limit = 3) {
    // Mock search results
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockResults = [
      {
        title: `Search result for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for "${query}". In a real application, this would return actual web search results.`
      },
      {
        title: `Related information about ${query}`,
        url: `https://wikipedia.org/wiki/${encodeURIComponent(query)}`,
        snippet: `Wikipedia article providing comprehensive information about ${query}.`
      },
      {
        title: `Latest news about ${query}`,
        url: `https://news.example.com/${encodeURIComponent(query)}`,
        snippet: `Recent news and updates related to ${query}.`
      }
    ];
    
    return {
      query: query,
      results: mockResults.slice(0, limit),
      total: mockResults.length
    };
  },

  async send_email(to, subject, body) {
    // Mock email sending
    await new Promise(resolve => setTimeout(resolve, 400));
    
    console.log('📧 Mock Email Sent:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      to: to,
      subject: subject,
      sentAt: new Date().toISOString()
    };
  }
};

async function basicFunctionCalling() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('🚀 Basic Function Calling Example\n');

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

  try {
    const messages = [
      { role: 'user', content: 'What\'s the weather like in Tokyo?' }
    ];

    console.log('🤖 User:', messages[0].content);
    
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages,
      tools: [weatherTool],
      tool_choice: 'auto'
    });

    if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔧 Function call: ${toolCall.function.name}`);
      console.log('📋 Arguments:', args);
      
      // Execute the function
      const result = await functions[toolCall.function.name](args.location, args.unit);
      console.log('📊 Function result:', result);
      
      // Continue the conversation with the function result
      messages.push(response.choices[0].message);
      messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id
      });
      
      const finalResponse = await client.chat.completions.create({
        model: 'llama4-scout',
        messages
      });
      
      console.log('🤖 Assistant:', finalResponse.choices[0].message.content);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function multipleFunctionCalling() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('\n🔧 Multiple Function Calling Example\n');

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather information for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
          },
          required: ['location']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Perform mathematical calculations',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression to evaluate' }
          },
          required: ['expression']
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
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Number of results' }
          },
          required: ['query']
        }
      }
    }
  ];

  try {
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Calculate 25 * 4, get weather for London, and search for "AI developments 2024"' }
      ],
      tools
    });

    if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCalls = response.choices[0].message.tool_calls;
      console.log(`🔧 Model wants to call ${toolCalls.length} functions:\n`);
      
      for (let i = 0; i < toolCalls.length; i++) {
        const call = toolCalls[i];
        const args = JSON.parse(call.function.arguments);
        
        console.log(`${i + 1}. ${call.function.name}(${Object.entries(args).map(([k,v]) => `${k}: "${v}"`).join(', ')})`);
        
        // Execute the function
        const result = await functions[call.function.name](...Object.values(args));
        console.log('   Result:', JSON.stringify(result, null, 2));
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function streamingFunctionCalls() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('\n📡 Streaming Function Calls Example\n');

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
            description: 'Mathematical expression to evaluate'
          }
        },
        required: ['expression']
      }
    }
  };

  try {
    let functionName = '';
    let functionArgs = '';
    let functionId = '';

    const stream = await client.chat.completions.stream({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Calculate the square root of 144 plus 25 times 3' }
      ],
      tools: [calculatorTool]
    }, {
      onProgress: (chunk) => {
        if (chunk.choices[0].delta.tool_calls) {
          const toolCall = chunk.choices[0].delta.tool_calls[0];
          
          if (toolCall.id) {
            functionId = toolCall.id;
          }
          
          if (toolCall.function?.name) {
            functionName = toolCall.function.name;
            console.log(`🔧 Starting function call: ${functionName}`);
          }
          
          if (toolCall.function?.arguments) {
            functionArgs += toolCall.function.arguments;
            process.stdout.write(toolCall.function.arguments);
          }
        }
      },
      onComplete: async () => {
        if (functionArgs) {
          console.log(`\n📋 Complete arguments: ${functionArgs}`);
          
          try {
            const args = JSON.parse(functionArgs);
            const result = await functions[functionName](args.expression);
            console.log('📊 Function result:', result);
          } catch (error) {
            console.log('❌ Error executing function:', error.message);
          }
        }
      }
    });

    for await (const chunk of stream) {
      if (chunk.choices[0].finish_reason === 'tool_calls') {
        console.log('\n✅ Function calling stream completed');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function forcedFunctionChoice() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('\n⚙️ Forced Function Choice Example\n');

  const emailTool = {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to someone',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body content' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  };

  try {
    // Force the model to use the email function
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'I need to contact Sarah about the meeting tomorrow' }
      ],
      tools: [emailTool],
      tool_choice: {
        type: 'function',
        function: { name: 'send_email' }
      }
    });

    if (response.choices[0].finish_reason === 'tool_calls') {
      const toolCall = response.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log('🔧 Forced function call executed:');
      console.log(`Function: ${toolCall.function.name}`);
      console.log('Arguments:', args);
      
      // Execute the function
      const result = await functions.send_email(args.to, args.subject, args.body);
      console.log('\n📧 Email sending result:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🌟 EasyLLM Function Calling Examples\n');
  
  await basicFunctionCalling();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await multipleFunctionCalling();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await streamingFunctionCalls();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await forcedFunctionChoice();
  
  console.log('\n🎉 All function calling examples completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  basicFunctionCalling, 
  multipleFunctionCalling, 
  streamingFunctionCalls, 
  forcedFunctionChoice,
  functions 
};