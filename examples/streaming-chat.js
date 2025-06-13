const EasyLLM = require('../dist/index.js').default;

async function basicStreaming() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('🤖 Starting streaming chat...\n');
  
  try {
    const stream = await client.chat.completions.stream({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Tell me a short story about a brave little robot' }
      ],
      temperature: 0.8,
      max_tokens: 200
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        process.stdout.write(content);
      }
    }
    
    console.log('\n\n✅ Streaming completed!');
    console.log(`📝 Total characters: ${fullResponse.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function streamingWithCallbacks() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('\n🔄 Streaming with progress callbacks...\n');
  
  let chunkCount = 0;
  const startTime = Date.now();
  
  try {
    const stream = await client.chat.completions.stream({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Explain how streaming works in simple terms' }
      ],
      temperature: 0.7,
      max_tokens: 150
    }, {
      onProgress: (chunk) => {
        chunkCount++;
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          process.stdout.write(content);
        }
      },
      onComplete: () => {
        const duration = Date.now() - startTime;
        console.log(`\n\n✅ Stream completed: ${chunkCount} chunks in ${duration}ms`);
      },
      onError: (error) => {
        console.error('\n❌ Stream error:', error.message);
      }
    });

    // You can still iterate over the stream if needed
    for await (const chunk of stream) {
      // Additional processing could go here
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function cancellableStreaming() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  console.log('\n⏱️ Streaming with 3-second timeout...\n');
  
  const controller = new AbortController();
  
  // Cancel after 3 seconds
  const timeout = setTimeout(() => {
    console.log('\n⏹️ Cancelling stream...');
    controller.abort();
  }, 3000);
  
  try {
    const stream = await client.chat.completions.stream({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Write a very long essay about the future of artificial intelligence' }
      ],
      temperature: 0.7
    }, {
      signal: controller.signal,
      onProgress: (chunk) => {
        const content = chunk.choices[0]?.delta?.content || '';
        process.stdout.write(content);
      },
      onComplete: () => {
        clearTimeout(timeout);
        console.log('\n✅ Stream completed before timeout');
      }
    });

    for await (const chunk of stream) {
      // Process chunks
    }
    
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.log('\n🛑 Stream was cancelled');
    } else {
      console.error('\n❌ Stream error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 EasyLLM Streaming Examples\n');
  
  // Run examples one by one
  await basicStreaming();
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  await streamingWithCallbacks();
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  await cancellableStreaming();
  
  console.log('\n🎉 All examples completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { basicStreaming, streamingWithCallbacks, cancellableStreaming };