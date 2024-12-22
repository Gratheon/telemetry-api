import {expect} from '@jest/globals';

// port from docker-compose.test.yml
const URL = 'http://localhost:8600/entrance/v1/movement';

describe('POST /entrance/v1/movement', () => {
    describe('validation errors', () => {
        it('empty body should fail with missing hiveId', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',},
                body: JSON.stringify({}) // <-- empty body
            });

            const result = await response.json();
            expect(response.status).toBe(400);
            expect(result.error).toBe('Bad Request: hiveId not provided');
        });

        it('empty body should fail with missing fields', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',},
                body: JSON.stringify({
                    hiveId: 123,
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
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "hiveId": 123,
                "beesIn": 5,
                "beesOut": 3,
            })
        });

        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.message).toBe('OK');
    });
});