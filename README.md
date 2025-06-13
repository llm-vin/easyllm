# EasyLLM

A unified TypeScript/JavaScript SDK for OpenAI-compatible LLM APIs, including llm.vin and OpenAI.

## Features

- 🚀 **Universal API**: Works with llm.vin, OpenAI, and any OpenAI-compatible API
- 📝 **TypeScript Support**: Full type safety and IntelliSense
- 🔄 **Automatic Retries**: Built-in retry logic for robust API calls
- 🎯 **OpenAI Compatible**: Drop-in replacement for OpenAI SDK syntax
- 🛡️ **Error Handling**: Comprehensive error handling and validation

## Installation

```bash
npm install easyllm
```

## Quick Start

```typescript
import EasyLLM from 'easyllm';

const client = new EasyLLM({
  apiKey: 'your-api-key'
});

const response = await client.chat.completions.create({
  model: 'llama4-scout',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Supported APIs

- **llm.vin** - Access to multiple AI models (default)
- **OpenAI** - Official OpenAI API
- **Custom** - Any OpenAI-compatible endpoint

## Documentation

- [Complete API Documentation](./docs/README.md)
- [Usage Examples](./docs/examples.md)

## License

MIT © llm.vin