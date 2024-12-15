import {expect} from '@jest/globals';

// port from docker-compose.test.yml
const URL = 'http://localhost:8600/graphql';

describe('POST /graphql', () => {
    // describe('validation errors', () => {
    //     it('empty body should fail with missing hive_id', async () => {
    //         let response = await fetch(URL, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json',},
    //             body: JSON.stringify({}) // <-- empty body
    //         });
    //
    //         const result = await response.json();
    //         expect(response.status).toBe(400);
    //         expect(result.error).toBe('Bad Request: hive_id not provided');
    //     });
    //
    //     it('empty body should fail with missing fields', async () => {
    //         let response = await fetch(URL, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json',},
    //             body: JSON.stringify({
    //                 hive_id: 123,
    //                 // <-- missing fields
    //             })
    //         });
    //
    //         const result = await response.json();
    //         expect(response.status).toBe(400);
    //         expect(result.error).toBe('Bad Request: fields not provided');
    //     });
    // });


    // success case
    it('should respond with message:OK in case of success', async () => {
        let response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "query": `
                    mutation addMetric($hiveId: ID!, $fields: MetricSetInput!) {
                        addMetric(hiveId: $hiveId, fields: $fields) {
                            __typename
                            
                            ...on Error {
                                message
                                code
                            }
                            ...on AddMetricMessage {
                                message
                            }
                        }
                    }`,
                "variables": {
                    "hiveId": 123,
                    "fields": {
                        "temperatureCelsius": 12,
                        "weightKg": 0,
                        "humidityPercent": 0
                    }
                }
            })
        });

        const result = await response.text();
        expect(response.status).toBe(200);
        expect(result).toBe(
            `{"data":{"addMetric":{"__typename":"AddMetricMessage","message":"OK"}}}\n`
        );
    });
});