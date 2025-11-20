import {expect, describe, it} from '@jest/globals';

// Import setup to ensure mocks are properly configured
import './setup';

// Import API configuration
import { IOT_METRICS_URL, TEST_AUTH_HEADER } from './utils/api-config';

// Special test token that will be accepted without validation
const TEST_TOKEN = 'test-api-token';
const INVALID_TOKEN = 'invalid-test-token';
const hiveId = 1;

describe('POST /iot/v1/metrics', () => {
    describe('validation errors', () => {
        it('empty body should fail with missing hiveId', async () => {
            let response = await fetch(IOT_METRICS_URL, {
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
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId,
                    // <-- missing fields
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: fields not provided');
        });

        it('empty body should fail with fields as empty object', async () => {
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId,
                    fields: {} // <-- missing fields
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: fields not provided');
        });

        it('empty array should fail', async () => {
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify([])
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: no metrics provided');
        });

        it('array with missing hiveId should fail', async () => {
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify([{
                    fields: {
                        temperatureCelsius: 12
                    }
                }])
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: hiveId not provided');
        });
    });

    describe('success cases', () => {
        it('should respond with message:OK for single metric', async () => {
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId,
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

        it('should respond with message:OK for single metric with timestamp', async () => {
            const timestamp = Math.floor(Date.now() / 1000) - 3600;

            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId,
                    timestamp,
                    "fields": {
                        "temperatureCelsius": 15,
                        "weightKg": 10,
                        "humidityPercent": 50
                    }
                })
            });

            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.message).toBe('OK');
        });

        it('should respond with message:OK for array of metrics', async () => {
            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify([
                    {
                        hiveId,
                        "fields": {
                            "temperatureCelsius": 12,
                            "weightKg": 10,
                            "humidityPercent": 45
                        }
                    },
                    {
                        hiveId,
                        "fields": {
                            "temperatureCelsius": 13,
                            "weightKg": 11,
                            "humidityPercent": 46
                        }
                    }
                ])
            });

            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.message).toBe('OK');
        });

        it('should accept 12 metrics with hourly timestamps', async () => {
            const now = Math.floor(Date.now() / 1000);
            const metrics = [];

            for (let i = 0; i < 12; i++) {
                metrics.push({
                    hiveId,
                    timestamp: now - (i * 3600),
                    fields: {
                        temperatureCelsius: 20 + i,
                        weightKg: 50 + i * 0.5,
                        humidityPercent: 55 + i
                    }
                });
            }

            let response = await fetch(IOT_METRICS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify(metrics)
            });

            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.message).toBe('OK');
        });
    });
});

describe('API Token Authentication', () => {
    it('should reject requests without an authorization header', async () => {
        let response = await fetch(IOT_METRICS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                hiveId,
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
        let response = await fetch(IOT_METRICS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'InvalidFormat token123'
            },
            body: JSON.stringify({
                hiveId,
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
        let response = await fetch(IOT_METRICS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
            body: JSON.stringify({
                hiveId,
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
        let response = await fetch(IOT_METRICS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INVALID_TOKEN}`
            },
            body: JSON.stringify({
                hiveId,
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
        let response = await fetch(IOT_METRICS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                hiveId,
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