/**
 * @fileoverview Web search examples for EasyLLM
 * @module web-search-examples
 */

const EasyLLM = require('../dist/index.js').default;

// Initialize client with web search enabled
const client = new EasyLLM({
  apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key',
  webSearch: {
    enabled: true,
    maxResults: 5,
    includeContent: true,
  },
});

async function webSearchExample() {
  try {
    // Example 1: Manual web search parameter
    console.log('Example 1: Explicit web search parameter');
    const response1 = await client.chat.completions.create({
      model: 'llama4-maverick',
      messages: [
        {
          role: 'user',
          content: 'What are the latest developments in quantum computing? Please search for recent news.',
        },
      ],
      webSearch: true, // Explicitly enable web search for this request
    });

    console.log('Response:', response1.choices[0].message.content);
    console.log('\n---\n');

    // Example 2: Automatic web search (using global config)
    console.log('Example 2: Automatic web search (global config)');
    const response2 = await client.chat.completions.createWithWebSearch({
      model: 'llama4-maverick',
      messages: [
        {
          role: 'user',
          content: 'What is the current weather in New York City?',
        },
      ],
    });

    console.log('Response:', response2.choices[0].message.content);
    console.log('\n---\n');

    // Example 3: Streaming with web search
    console.log('Example 3: Streaming with web search');
    const stream = await client.chat.completions.streamWithWebSearch({
      model: 'llama4-maverick',
      messages: [
        {
          role: 'user',
          content: 'Tell me about the latest news in artificial intelligence research.',
        },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        process.stdout.write(chunk.choices[0].delta.content);
      }
    }
    console.log('\n\n---\n');

    // Example 4: Dynamic web search control
    console.log('Example 4: Dynamic web search control');
    
    // Disable web search
    client.setWebSearchEnabled(false);
    console.log('Web search enabled:', client.isWebSearchEnabled());
    
    // Re-enable web search
    client.setWebSearchEnabled(true);
    console.log('Web search enabled:', client.isWebSearchEnabled());

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
if (require.main === module) {
  webSearchExample();
}

module.exports = { webSearchExample };