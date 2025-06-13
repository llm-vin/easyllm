const EasyLLM = require('../dist/index.js').default;

async function main() {
  const client = new EasyLLM({
    apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here'
  });

  try {
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'What is the capital of France?' }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    console.log('Response:', response.choices[0].message.content);
    console.log('Usage:', response.usage);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();