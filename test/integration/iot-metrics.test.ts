import {expect, describe, it, beforeAll, afterAll, jest} from '@jest/globals';

// Import setup to ensure mocks are properly configured
import './setup';

// port from docker-compose.test.yml
const URL = 'http://localhost:8600/iot/v1/metrics';

// Special header for testing
const TEST_AUTH_HEADER = 'X-Test-Auth-Bypass';

// Special test token that will be accepted without validation
const TEST_TOKEN = 'test-api-token';
const INVALID_TOKEN = 'invalid-test-token';

describe('POST /iot/v1/metrics', () => {
    describe('validation errors', () => {
        it('empty body should fail with missing hiveId', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({}) // <-- empty body
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: hiveId not provided');
        });

        it('empty body should fail with missing fields', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId: 123,
                    // <-- missing fields
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: fields not provided');
        });

        it('empty body should fail with fields as empty object', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId: 123,
                    fields: {} // <-- missing fields
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: fields not provided');
        });
    });

    // success case
    it('should respond with message:OK in case of success', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [TEST_AUTH_HEADER]: 'true'
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
    });
});

describe('API Token Authentication', () => {
    it('should reject requests without an authorization header', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should reject requests with an invalid token format', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'InvalidFormat token123'
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should reject requests with an empty bearer token', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should reject requests with an invalid token', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INVALID_TOKEN}`
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized: Invalid token');
    });

    it('should accept requests with a valid token', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                "hiveId": 123,
                "fields": {
                    "temperatureCelsius": 12,
                    "weightKg": 0,
                    "humidityPercent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
    });
});