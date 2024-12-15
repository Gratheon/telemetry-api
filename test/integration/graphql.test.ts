import {expect} from '@jest/globals';

// port from docker-compose.test.yml
const URL = 'http://localhost:8600/graphql';

const hiveId = 7;
describe('POST /graphql', () => {
    describe('addMetric', () => {
        describe('validation errors', () => {
            it('empty body should fail with missing fields', async () => {
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
                            "hiveId": hiveId,
                            "fields": {}
                        }
                    })
                });

                const result = await response.text();
                expect(response.status).toBe(200); // <-- yes, GraphQL always returns 200 even if there is an error
                expect(result).toBe(
                    `{"data":{"addMetric":{"__typename":"Error","message":"Bad Request: fields not provided","code":"4002"}}}\n`
                );
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
                        "hiveId": hiveId,
                        "fields": {
                            "temperatureCelsius": Math.random() * 60 - 20,
                            "weightKg": Math.random() * 100,
                            "humidityPercent": Math.random() * 100
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

    describe('temperatureCelsius', () => {
        it('should return temperature data', async () => {
            let response = await fetch(URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "query": `
                    query temperatureCelsius($hiveId: ID!) {
                        temperatureCelsius(hiveId: $hiveId) {
                            time
                            value
                        }
                    }`,
                    "variables": {
                        "hiveId": hiveId
                    }
                })
            });

            const result = await response.json();
            expect(response.status).toBe(200);
            console.log(result.data)
            expect(result.data.temperatureCelsius.length).not.toEqual(0);
        });
    })

});