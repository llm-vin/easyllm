# Testing Guide

This guide explains how to test the EasyLLM SDK.

## Test Types

### Unit Tests
Test individual functions and components in isolation using mocked dependencies.

```bash
npm run test:unit
```

### Integration Tests
Test the SDK against real APIs (requires API keys).

```bash
npm run test:integration
```

### All Tests
Run both unit and integration tests:

```bash
npm test
```

### Watch Mode
Run tests in watch mode during development:

```bash
npm run test:watch
```

### Coverage Report
Generate test coverage report:

```bash
npm run test:coverage
```

## Setup for Integration Tests

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```bash
LLM_VIN_API_KEY=your_actual_llm_vin_api_key
OPENAI_API_KEY=your_actual_openai_api_key  # Optional for OpenAI tests
```

**Note**: Integration tests will be skipped if no API keys are provided.

## Test Structure

### Unit Tests (`src/__tests__/client.test.ts`)
- Test client initialization with different configurations
- Test all API methods with mocked responses
- Test error handling scenarios
- Test OpenAI-compatible syntax (e.g., `client.chat.completions.create()`)

### Integration Tests (`src/__tests__/integration.test.ts`)
- Test real API calls to llm.vin
- Test real API calls to OpenAI (if key provided)
- Test error handling with invalid keys/models
- Test different parameter configurations

## Running Tests

### Prerequisites
```bash
npm install
```

### Unit Tests Only
```bash
npm run test:unit
```
These tests run quickly and don't require API keys.

### Integration Tests Only
```bash
npm run test:integration
```
These tests require valid API keys and make real API calls.

### With Coverage
```bash
npm run test:coverage
```
Generates an HTML coverage report in `coverage/lcov-report/index.html`.

## Test Configuration

Tests are configured in `jest.config.js`:
- Uses `ts-jest` for TypeScript support
- 60-second timeout for integration tests
- Automatic mock clearing between tests
- Coverage collection from `src/` directory

## Writing New Tests

### Unit Test Example
```typescript
import { EasyLLM } from '../client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('New Feature', () => {
  let client: EasyLLM;
  
  beforeEach(() => {
    client = new EasyLLM({ apiKey: 'test-key' });
  });
  
  it('should handle new feature', async () => {
    // Mock the axios response
    mockedAxios.create().post.mockResolvedValue({ 
      data: { success: true } 
    });
    
    const result = await client.newFeature();
    expect(result.success).toBe(true);
  });
});
```

### Integration Test Example
```typescript
describe('New Feature Integration', () => {
  const apiKey = process.env.LLM_VIN_API_KEY;
  const testCondition = apiKey ? it : it.skip;
  
  testCondition('should work with real API', async () => {
    const client = new EasyLLM({ apiKey: apiKey! });
    const result = await client.newFeature();
    expect(result).toBeDefined();
  }, 30000); // 30 second timeout
});
```

## Continuous Integration

For CI/CD pipelines:

```bash
# Run unit tests (no API keys needed)
npm run test:unit

# Run with coverage
npm run test:coverage

# Skip integration tests in CI unless secrets are available
CI=true npm test
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in `jest.config.js` or individual test files
- Check network connectivity for integration tests

### Module Not Found Errors
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript compilation is working: `npm run build`

### API Key Issues
- Verify API keys are correct in `.env` file
- Integration tests will skip if no API keys are provided
- Check API key permissions and quotas