import {expect} from '@jest/globals';

// Import API configuration
import { GRAPHQL_URL, TEST_AUTH_HEADER } from './utils/api-config';

const hiveId = 7;
describe('POST /graphql', () => {
    describe('addMetric', () => {
        describe('validation errors', () => {
            it('empty body should fail with missing fields', async () => {
                let response = await fetch(GRAPHQL_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [TEST_AUTH_HEADER]: 'true'
                    },
                    body: JSON.stringify({
                        "query": `
                    mutation addMetric($hiveId: ID!, $fields: MetricSetInput!) {
                        addMetric(hiveId: $hiveId, fields: $fields) {
                            __typename
                            
                            ...on TelemetryError {
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
                    `{"data":{"addMetric":{"__typename":"TelemetryError","message":"Bad Request: fields not provided","code":"4002"}}}\n`
                );
            });
        });
    });

    describe('temperatureCelsius', () => {
        describe('with timeRangeMin param', () => {
            async function fetchWithTimeRange(timeRange) {
                let response = await fetch(GRAPHQL_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [TEST_AUTH_HEADER]: 'true'
                    },
                    body: JSON.stringify({
                        "query": `
                    query temperatureCelsius($hiveId: ID!, $timeRangeMin: Int) {
                        temperatureCelsius(hiveId: $hiveId, timeRangeMin: $timeRangeMin) {
                            ... on MetricFloatList{
                                metrics{ t v }
                            }
                            
                            ... on TelemetryError{
                                message
                                code
                            }
                        }
                    }`,
                        "variables": {
                            "hiveId": hiveId,
                            "timeRangeMin": timeRange
                        }
                    })
                });
                return response;
            }

            it('should fail if timeRangeMin is 0', async () => {
                let response = await fetchWithTimeRange(0);  // <-- this is not a valid value

                const result = await response.text();
                expect(response.status).toBe(200);
                expect(result).toBe(
                    `{"data":{"temperatureCelsius":{"message":"Time range must be positive","code":"4003"}}}\n`
                );
            });

            it('should fail if timeRangeMin is negative', async () => {
                let response = await fetchWithTimeRange(-100);  // <-- this is not a valid value

                const result = await response.text();
                expect(response.status).toBe(200);
                expect(result).toBe(
                    `{"data":{"temperatureCelsius":{"message":"Time range must be positive","code":"4003"}}}\n`
                );
            });

            it('should fail if timeRangeMin is too big', async () => {
                let response = await fetchWithTimeRange(60*24*8);  // <-- this is not a valid value, should be below 1 week

                const result = await response.text();
                expect(response.status).toBe(200);
                expect(result).toBe(
                    `{"data":{"temperatureCelsius":{"message":"Time range cannot exceed 7 days","code":"4003"}}}\n`
                );
            });
        });

        it('should return temperature data', async () => {
            let response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [TEST_AUTH_HEADER]: 'true'
                },
                body: JSON.stringify({
                    "query": `
                    query temperatureCelsius($hiveId: ID!) {
                        temperatureCelsius(hiveId: $hiveId) {
                            ... on MetricFloatList{
                                metrics{ t v }
                            }
                            
                            ... on TelemetryError{
                                message
                                code
                            }
                        }
                    }`,
                    "variables": {
                        "hiveId": hiveId
                    }
                })
            });

            const result = await response.json();
            expect(response.status).toBe(200);
            expect(result.data.temperatureCelsius.length).not.toEqual(0);
        });
    })

});