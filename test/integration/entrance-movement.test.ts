import {expect, describe, it} from '@jest/globals';

// Import setup to ensure mocks are properly configured
import './setup';

// Import API configuration
import { ENTRANCE_MOVEMENT_URL, TEST_AUTH_HEADER } from './utils/api-config';

describe('POST /entrance/v1/movement', () => {
    describe('validation errors', () => {
        it('empty body should fail with missing hiveId', async () => {
            let response = await fetch(ENTRANCE_MOVEMENT_URL, {
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

        it('empty body should fail with missing sectionId', async () => {
            let response = await fetch(ENTRANCE_MOVEMENT_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId: 123,
                    // <-- missing sectionId
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: boxId not provided');
        });

        it('empty body should fail with missing fields', async () => {
            let response = await fetch(ENTRANCE_MOVEMENT_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    hiveId: 123,
                    boxId: 123,
                    // <-- missing fields
                })
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: beesOut or beesIn are not provided');
        });
    });

    // success case
    it('should respond with message:OK in case of success', async () => {
        let response = await fetch(ENTRANCE_MOVEMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [TEST_AUTH_HEADER]: 'true'
            },
            body: JSON.stringify({
                "hiveId": 10,
                "boxId": 41,

                "beesIn": Math.ceil(Math.random()*100),
                "beesOut": Math.ceil(Math.random()*100),
                "netFlow": Math.ceil(Math.random()*100),
                "avgSpeed": Math.random()*10,
                "p95Speed": Math.random()*20,
                "stationaryBees": Math.ceil(Math.random()*5),
                "detectedBees": Math.ceil(Math.random()*100),
            })
        });

        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
    });
});
