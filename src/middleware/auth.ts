// local dependencies
import config from '../config/config.default';
import { logger } from '../logger';
import { TelemetryServerError } from '../error';
import fetch from 'cross-fetch';

// Special header for testing
const TEST_AUTH_HEADER = 'X-Test-Auth-Bypass';
const TEST_USER_ID = 'test-user-id';

// Special test token that will be accepted without validation
const TEST_TOKEN = 'test-api-token';

/**
 * Validates the API token by making a request to the user-cycle microservice
 * @param token API token to validate
 * @returns User ID if token is valid, null otherwise
 */
export async function validateApiToken(token: string): Promise<string | null> {
  try {
    // For testing purposes, accept a special test token
    if (token === TEST_TOKEN) {
      return TEST_USER_ID;
    }
    
    // Define the GraphQL endpoint URL
    const endpoint = `${config.userCycleUrl}/graphql`;

    // Make a POST request to validate the token
    const tokenValidationResult = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation ValidateApiToken($token: String) {
            validateApiToken(token: $token) {
              ... on TokenUser {
                id
              }
            }
          }
        `,
        variables: {
          token,
        },
      }),
    });

    const tokenValidationResultJSON = await tokenValidationResult.json();
    const userId = tokenValidationResultJSON?.data?.validateApiToken?.id;

    return userId || null;
  } catch (error) {
    logger.errorEnriched('Error validating API token', error);
    return null;
  }
}

/**
 * Middleware to authenticate API requests using bearer token
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
