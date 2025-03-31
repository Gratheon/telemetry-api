// Mock implementation of the auth middleware for testing
import { TelemetryServerError } from '../../../src/error';
import { logger } from '../../../src/logger';

// Mock tokens
export const VALID_TOKEN = 'valid-test-token';
export const INVALID_TOKEN = 'invalid-test-token';

// Special header for testing
const TEST_AUTH_HEADER = 'X-Test-Auth-Bypass';
const TEST_USER_ID = 'test-user-id';

/**
 * Mock implementation of validateApiToken for testing
 * @param token API token to validate
 * @returns User ID if token is valid, null otherwise
 */
export async function validateApiToken(token: string): Promise<string | null> {
  // For testing, we'll consider 'valid-test-token' as valid
  if (token === VALID_TOKEN) {
    return 'test-user-id';
  }
  return null;
}

/**
 * Mock middleware to authenticate API requests using bearer token
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export async function authenticateApiToken(req, res, next) {
  try {
    // Check for test auth bypass header - only for integration tests
    if (req.headers[TEST_AUTH_HEADER.toLowerCase()] === 'true') {
      req.userId = TEST_USER_ID;
      return next();
    }
    
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      throw new TelemetryServerError('Unauthorized: Missing or invalid authorization header', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new TelemetryServerError('Unauthorized: Missing or invalid authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      throw new TelemetryServerError('Unauthorized: Missing or empty token', 401);
    }

    const userId = await validateApiToken(token);
    if (!userId) {
      throw new TelemetryServerError('Unauthorized: Invalid token', 401);
    }

    // Attach the user ID to the request object for use in route handlers
    req.userId = userId;
    next();
  } catch (error) {
    logger.errorEnriched('Authentication error', error);
    
    if (error instanceof TelemetryServerError) {
      return res.status(error.httpStatus || 401).send({
        error: error.message || 'Unauthorized'
      });
    }
    
    return res.status(500).send({
      error: 'Internal Server Error'
    });
  }
}
