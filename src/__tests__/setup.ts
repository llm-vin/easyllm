// Global test setup
import { config } from 'dotenv';

// Load environment variables from .env file if it exists
config();

// Set test timeout
jest.setTimeout(60000);

// Mock console methods to reduce test noise
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});