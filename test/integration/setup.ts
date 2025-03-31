// Test setup file
import { jest, beforeEach } from '@jest/globals';
import { VALID_TOKEN, validateApiToken } from './mocks/auth.mock';

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => {
  // Use type assertion to fix the 'unknown' type issue
  const originalModule = jest.requireActual('./mocks/auth.mock') as typeof import('./mocks/auth.mock');
  
  return {
    validateApiToken: jest.fn(originalModule.validateApiToken),
    authenticateApiToken: jest.fn(originalModule.authenticateApiToken),
  };
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

export { VALID_TOKEN };
