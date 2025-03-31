/**
 * API configuration for integration tests
 * 
 * This file centralizes the API URL configuration to make it easier to switch
 * between localhost (for local development) and the Docker service name (for CI/CD)
 */

// Use Docker service name in CI environment, localhost otherwise
// This allows tests to run both locally and in CI
export const API_HOST = process.env.CI ? 'telemetry-api' : 'localhost';
export const API_PORT = 8600;
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

// Special header for bypassing authentication in tests
export const TEST_AUTH_HEADER = 'X-Test-Auth-Bypass';

// Endpoint URLs
export const ENTRANCE_MOVEMENT_URL = `${API_BASE_URL}/entrance/v1/movement`;
export const HEALTH_URL = `${API_BASE_URL}/health`;
export const IOT_METRICS_URL = `${API_BASE_URL}/iot/v1/metrics`;
