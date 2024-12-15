import {expect} from '@jest/globals';

// port from docker-compose.test.yml
const URL = 'http://localhost:8600/metric';

describe('POST /metric', () => {
    describe('validation errors', () => {
        it('empty body should fail with missing hive_id', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',},
                body: JSON.stringify({}) // <-- empty body
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: hive_id not provided');
        });

        it('empty body should fail with missing fields', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',},
                body: JSON.stringify({
                    hive_id: 123,
                    // <-- missing fields
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
            },
            body: JSON.stringify({
                "hive_id": 123,
                "fields": {
                    "temperature_celsius": 12,
                    "weight_kg": 0,
                    "humidity_percent": 0
                }
            })
        });

        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
    });
});